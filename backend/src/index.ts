import { Hono } from 'hono'
import user from './user/user'
import blog from './blog/blog'

const app = new Hono();
//basePath('/api/v1')

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

app.route('/api/v1/user', user);
app.route('/api/v1/blog', blog);

export default app
