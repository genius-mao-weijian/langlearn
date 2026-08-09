// Node 版 submit 排错：使用内置 fetch
const email = 'debug_submit_' + Math.floor(Math.random() * 9999) + '@lang.test';
const pass = 'Passw0rd!';
const base = 'http://localhost:3000/api';

async function api(method, path, body, tok) {
  const res = await fetch(base + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(tok ? { Authorization: 'Bearer ' + tok } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json; try { json = JSON.parse(text); } catch { json = text; }
  return { status: res.status, body: json, text };
}

const reg = await api('POST', '/auth/register', { email, password: pass });
console.log('register', reg.status, reg.body.code, 'level=', reg.body.data?.user?.level);
const tok = reg.body.data.accessToken;

const c = await api('GET', '/courses?language=en', null, tok);
const courseId = c.body.data[0].id;
const l = await api('GET', '/courses/' + courseId + '/lessons', null, tok);
const ex1 = l.body.data[0].exerciseIds[0];
console.log('exercise=', ex1);

const s = await api('POST', '/learning/' + ex1 + '/submit', { answer: 'WRONG' }, tok);
console.log('submit-wrong status=', s.status, 'body=', s.text);
