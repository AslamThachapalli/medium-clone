import { Hono } from "hono";
import { PrismaClient } from '@prisma/client/edge'
import { withAccelerate } from '@prisma/extension-accelerate'
import { verify } from "hono/jwt";

const blog = new Hono<{
    Bindings: {
        DATABASE_URL: string,
        JWT_SECRET: string,
    },
    Variables: {
        userId: string
    }
}>();

blog.use("*", async (c, next) => {
    const authHeader = c.req.header('Authorization');
    if (!authHeader) {
        c.status(401);
        return c.json({ error: 'Unable to authenticate' });
    }
    const token = authHeader.split(' ')[1];
    const secret = c.env.JWT_SECRET;

    try {
        const decodedPayload = await verify(token, secret);
        if (!decodedPayload) {
            c.status(401);
            return c.json({ error: 'invalid token' });
        }
        const userId = decodedPayload.id;
        c.set('userId', userId);
        await next();
    } catch (e) {
        c.status(401);
        return c.json({ error: 'invalid token' });
    }

});

blog.post('/', async (c) => {
    const prisma = new PrismaClient({
        datasourceUrl: c.env.DATABASE_URL,
    }).$extends(withAccelerate());

    const userId = c.get('userId');
    const body = await c.req.json();

    const post = await prisma.post.create({
        data: {
            title: body.title,
            content: body.content,
            authorId: userId,
        }
    })

    return c.json({ id: post.id });
});

blog.put('/', async (c) => {
    const prisma = new PrismaClient({
        datasourceUrl: c.env.DATABASE_URL,
    }).$extends(withAccelerate());

    const userId = c.get('userId');
    const body = await c.req.json();

    const updatedPost = await prisma.post.update({
        where: {
            id: body.id,
            authorId: userId,
        },
        data: {
            title: body.title,
            content: body.content,
        }
    });

    return c.text('updated post');

})

blog.get('/bulk', async (c) => {
    const prisma = new PrismaClient({
        datasourceUrl: c.env.DATABASE_URL,
    }).$extends(withAccelerate());

    const allPosts = await prisma.post.findMany();

    return c.json(allPosts);
});

blog.get('/:id', async (c) => {
    const prisma = new PrismaClient({
        datasourceUrl: c.env.DATABASE_URL,
    }).$extends(withAccelerate());

    const postId = c.req.param('id');
    const userId = c.get('userId');

    const post = await prisma.post.findUnique({
        where: {
            id: postId,
            authorId: userId,
        }
    });

    if (post) {
        return c.json({
            post
        })
    } else {
        return c.json({ msg: 'No post found' })
    }
});

export default blog;