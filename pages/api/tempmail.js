export default async function handler(req, res) {
  const { action, login, domain, id } = req.query;

  const baseUrl = 'https://www.1secmail.com/api/v1/';

  try {
    let url = `${baseUrl}?action=${action}`;
    if (login) url += `&login=${login}`;
    if (domain) url += `&domain=${domain}`;
    if (id) url += `&id=${id}`;

    const response = await fetch(url);
    const data = await response.json();

    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch from 1secmail' });
  }
}
