export default async function handler(req, res) {
  const { action, sid_token, id, seq } = req.query;

  const baseUrl = 'https://api.guerrillamail.com/ajax.php';

  try {
    let url = `${baseUrl}?`;
    
    if (action === 'genRandomMailbox') {
      url += 'f=get_email_address';
    } else if (action === 'getMessages') {
      url += `f=check_email&seq=${seq || 0}&sid_token=${sid_token}`;
    } else if (action === 'readMessage') {
      url += `f=fetch_email&email_id=${id}&sid_token=${sid_token}`;
    } else {
      return res.status(400).json({ error: 'Invalid action' });
    }

    const response = await fetch(url);
    const data = await response.json();

    // Simplify the data for our frontend
    if (action === 'genRandomMailbox') {
      res.status(200).json({
        email: data.email_addr,
        sid_token: data.sid_token
      });
    } else if (action === 'getMessages') {
      const messages = (data.list || []).map(msg => ({
        id: msg.mail_id,
        from: msg.mail_from,
        subject: msg.mail_subject,
        date: msg.mail_date,
        excerpt: msg.mail_excerpt
      }));
      res.status(200).json(messages);
    } else if (action === 'readMessage') {
      res.status(200).json({
        htmlBody: data.mail_body,
        body: data.mail_body.replace(/<[^>]*>?/gm, ''),
        from: data.mail_from,
        subject: data.mail_subject,
        date: data.mail_date
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch from GuerrillaMail' });
  }
}
