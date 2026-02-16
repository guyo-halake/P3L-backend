import db from '../config/db.js';

// Get all invoices for a specific client
export const getInvoicesByClientId = async (req, res) => {
    try {
        const { clientId } = req.params;
        const [rows] = await db.execute(
            'SELECT * FROM invoices WHERE client_id = ? ORDER BY date DESC',
            [clientId]
        );
        res.json(rows);
    } catch (error) {
        console.error('Error fetching invoices:', error);
        res.status(500).json({ message: 'Failed to fetch invoices' });
    }
};

// Create a new invoice
export const createInvoice = async (req, res) => {
    try {
        const { client_id, amount, status, date, due_date, description, items } = req.body;
        const pdf_url = req.file ? `/uploads/${req.file.filename}` : null;

        if (!client_id || !amount || !date) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        const [result] = await db.execute(
            `INSERT INTO invoices (client_id, amount, status, date, due_date, description, items, pdf_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [client_id, amount, status || 'Draft', date, due_date || null, description || '', JSON.stringify(items || []), pdf_url]
        );

        res.status(201).json({ id: result.insertId, ...req.body });
    } catch (error) {
        console.error('Error creating invoice:', error);
        res.status(500).json({ message: 'Failed to create invoice' });
    }
};

// Update invoice status
export const updateInvoiceStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        await db.execute('UPDATE invoices SET status = ? WHERE id = ?', [status, id]);
        res.json({ success: true });
    } catch (error) {
        console.error('Error updating invoice:', error);
        res.status(500).json({ message: 'Failed to update invoice' });
    }
}

// Delete invoice
export const deleteInvoice = async (req, res) => {
    try {
        const { id } = req.params;
        await db.execute('DELETE FROM invoices WHERE id = ?', [id]);
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting invoice:', error);
        res.status(500).json({ message: 'Failed to delete invoice' });
    }
}
