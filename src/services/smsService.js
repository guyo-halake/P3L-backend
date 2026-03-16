
import axios from 'axios';

/**
 * Send SMS via AfricasTalking API
 * @param {string} to - Recipient phone number
 * @param {string} message - Message content
 */
export const sendSMSInternal = async (to, message) => {
    const username = process.env.AT_USERNAME;
    const apiKey = process.env.AT_API_KEY;

    if (!username || !apiKey) {
        console.warn('[SMS] AT_USERNAME or AT_API_KEY not configured. Skipping SMS.');
        return { success: false, error: 'Not configured' };
    }

    const isSandbox = username.toLowerCase() === 'sandbox';
    const apiUrl = isSandbox
        ? 'https://api.sandbox.africastalking.com/version1/messaging'
        : 'https://api.africastalking.com/version1/messaging';

    try {
        const params = new URLSearchParams();
        params.append('username', username);
        params.append('to', to);
        params.append('message', message);

        const response = await axios.post(apiUrl, params, {
            headers: {
                'apiKey': apiKey,
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json'
            }
        });

        return { success: true, data: response.data };
    } catch (error) {
        console.error('[SMS] Send Failed:', error.response?.data || error.message);
        return { success: false, error: error.message };
    }
};
