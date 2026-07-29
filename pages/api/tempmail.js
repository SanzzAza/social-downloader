export default async function handler(req, res) {
  const { action, login, id } = req.query;

  const baseUrl = 'https://inboxkitten.com/api/v1/mail';

  try {
    if (action === 'genRandomMailbox') {
      // InboxKitten doesn't have a generate mailbox API, we just create a random name
      const randomName = Math.random().toString(36).substring(2, 12);
      return res.status(200).json([`${randomName}@inboxkitten.com`]);
    }

    if (action === 'getMessages') {
      const response = await fetch(`${baseUrl}/list?recipient=${login}`);
      const data = await response.json();
      
      // Map InboxKitten format to a simpler format
      const messages = data.map(item => ({
        id: item.storage.key,
        from: item.message.from,
        subject: item.message.subject,
        date: new Date(item.message.timestamp).toLocaleString()
      }));

      return res.status(200).json(messages);
    }

    if (action === 'readMessage') {
      const response = await fetch(`${baseUrl}/get?recipient=${login}&mailKey=${id}`);
      const data = await response.json();
      
      return res.status(200).json({
        htmlBody: data.html,
        body: data.text,
        subject: '', // InboxKitten doesn't repeat subject here easily
        from: '',
        date: ''
      });
    }

    res.status(400).json({ error: 'Invalid action' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch from InboxKitten' });
  }
}
