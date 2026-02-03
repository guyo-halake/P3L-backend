import { Client } from '@notionhq/client';
import db from '../config/db.js';

// In-memory cache for simplicity (or use Redis/DB in prod)
// We store the user's token in the session or DB. 
// For this MVP, we'll assume the client sends the token or we look it up from the user record.

const getNotionClient = async (req) => {
  // 1. Try to get token from header
  let token = req.headers['x-notion-token'];

  // 2. If not in header, check user record in DB (gracefully handle missing column)
  if (!token && req.query.user_id) {
    try {
      const [rows] = await db.execute('SELECT notion_token FROM users WHERE id = ?', [req.query.user_id]);
      if (rows.length > 0 && rows[0].notion_token) token = rows[0].notion_token;
    } catch (dbError) {
      // Ignore DB errors (like missing column) and fall back to env token
      console.warn("Skipping user DB token lookup:", dbError.message);
    }
  }

  // 3. Fallback to server env token (Master Token)
  if (!token) {
    token = process.env.NOTION_TOKEN;
  }

  if (!token) throw new Error('Notion token not found');

  return new Client({ auth: token });
};

export const checkConnection = async (req, res) => {
  // Check if server env has token or if user has one in DB
  try {
    // simple check: if we can get a client without throwing, we have a token
    await getNotionClient(req);
    res.json({ connected: true });
  } catch (e) {
    res.json({ connected: false });
  }
};

export const saveToken = async (req, res) => {
  const { user_id, token } = req.body;
  if (!user_id || !token) return res.status(400).json({ message: 'Missing user_id or token' });

  try {
    // Check if column exists, if not, we might need a migration, but for now assuming it exists or we use a separate table
    // For safety, let's use a settings table or update users if column exists.
    // Simplifying: we will assume users table has notion_token or we create a setting.

    // Let's fallback to specific table or just updates users
    // If column doesn't exist, this will fail. Let's try to update users table.
    // NOTE: In a real app, run a migration. Here I will assume we can store it.

    await db.execute('UPDATE users SET notion_token = ? WHERE id = ?', [token, user_id]);
    res.json({ success: true, message: 'Token saved' });
  } catch (error) {
    console.error('Save Token Error:', error);
    // Fallback: if column missing, maybe store in a preferences table or fail
    res.status(500).json({ message: 'Database error', error: error.message });
  }
};

export const search = async (req, res) => {
  try {
    const notion = await getNotionClient(req);
    const { query } = req.query;

    const response = await notion.search({
      query: query || undefined,
      sort: {
        direction: 'descending',
        timestamp: 'last_edited_time',
      },
      page_size: 100,
    });

    // Process results to be frontend-friendly
    const results = response.results.map(item => {
      let title = 'Untitled';
      if (item.properties) {
        // Databases have title array
        if (item.title && item.title.length > 0) title = item.title[0].plain_text;
        // Pages in databases have properties with dynamic keys. Need to find the "title" type property.
        else {
          const titleProp = Object.values(item.properties).find(p => p.type === 'title');
          if (titleProp && titleProp.title.length > 0) title = titleProp.title[0].plain_text;
        }
      }

      return {
        id: item.id,
        title,
        type: item.object, // page or database
        lastEdited: item.last_edited_time,
        url: item.url,
        icon: item.icon,
        cover: item.cover,
        parent: item.parent
      };
    });

    res.json(results);
  } catch (error) {
    console.error('Notion Search Error:', error);
    res.status(500).json({ message: 'Failed to search Notion', error: error.message });
  }
};

export const getDatabase = async (req, res) => {
  try {
    const notion = await getNotionClient(req);
    const { id } = req.params;

    const response = await notion.databases.query({
      database_id: id,
      page_size: 50,
    });

    res.json(response.results);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch database', error: error.message });
  }
};

// Helper to recursively fetch children for specific container types
const fetchBlockChildren = async (notion, blockId) => {
  const response = await notion.blocks.children.list({ block_id: blockId });
  const blocks = response.results;

  // Recursively fetch children for container types (tables, columns, toggles)
  // We use Promise.all to fetch in parallel, but be mindful of rate limits in prod
  const childrenPromises = blocks.map(async (block) => {
    if (block.has_children && (['table', 'column_list', 'column', 'toggle', 'to_do'].includes(block.type))) {
      try {
        block.children = await fetchBlockChildren(notion, block.id);
      } catch (e) {
        console.error(`Failed to fetch children for block ${block.id}`, e);
        block.children = [];
      }
    }
    return block;
  });

  return Promise.all(childrenPromises);
};

export const getPage = async (req, res) => {
  try {
    const notion = await getNotionClient(req);
    const { id } = req.params;

    // Get page metadata
    const page = await notion.pages.retrieve({ page_id: id });

    // Get blocks (content) with recursion for containers
    const blocks = await fetchBlockChildren(notion, id);

    res.json({ page, blocks });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch page', error: error.message });
  }
};

export const createPage = async (req, res) => {
  try {
    const notion = await getNotionClient(req);
    const { parentId, title, content } = req.body;

    const response = await notion.pages.create({
      parent: { page_id: parentId },
      properties: {
        title: [
          {
            text: {
              content: title,
            },
          },
        ],
      },
      children: [
        {
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [
              {
                text: {
                  content: content || '',
                },
              },
            ],
          },
        },
      ],
    });

    res.json(response);
  } catch (error) {
    res.status(500).json({ message: 'Failed to create page', error: error.message });
  }
};

export const deleteBlock = async (req, res) => {
  try {
    const notion = await getNotionClient(req);
    const { id } = req.params;

    // Deleting a block in Notion is just archiving it
    const response = await notion.blocks.delete({
      block_id: id,
    });

    res.json(response);
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete block', error: error.message });
  }
};

export const updateBlock = async (req, res) => {
  try {
    const notion = await getNotionClient(req);
    const { id } = req.params;
    const { content, type } = req.body;

    // Construct update content dynamically based on type
    // This is simplified; robust impl would handle all types
    const blockUpdate = {};
    if (type && content) {
      blockUpdate[type] = {
        rich_text: [{
          text: { content: content }
        }]
      };
    }

    const response = await notion.blocks.update({
      block_id: id,
      ...blockUpdate
    });

    res.json(response);
  } catch (error) {
    res.status(500).json({ message: 'Failed to update block', error: error.message });
  }
};

export const appendBlock = async (req, res) => {
  try {
    const notion = await getNotionClient(req);
    const { id } = req.params; // Parent ID (page or block)
    const { content, type = 'paragraph' } = req.body;

    const response = await notion.blocks.children.append({
      block_id: id,
      children: [
        {
          object: 'block',
          type: type,
          [type]: {
            rich_text: [
              {
                text: {
                  content: content || 'New text block',
                },
              },
            ],
          },
        },
      ],
    });

    res.json(response);
  } catch (error) {
    res.status(500).json({ message: 'Failed to create block', error: error.message });
  }
};
