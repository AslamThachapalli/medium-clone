import { Hono } from "hono";
import { PrismaClient } from '@prisma/client/edge'
import { withAccelerate } from '@prisma/extension-accelerate'
import { sign } from 'hono/jwt'
import { signinInput, signupInput } from "@aslamthachapalli/medium-common";

const user = new Hono<{
    Bindings: {
        DATABASE_URL: string,
        JWT_SECRET: string,
    }
}>();

user.post('/signup', async (c) => {
    const prisma = new PrismaClient({
        datasourceUrl: c.env.DATABASE_URL,
    }).$extends(withAccelerate())

    const body = await c.req.json();
    const {success} = signupInput.safeParse(body);

    if(!success){
        c.status(411);
        return c.json({
            message: 'wrong inputs'
        })
    }

    try {
        const user = await prisma.user.create({
            data: {
                email: body.email,
                password: body.password,
            }
        });

        const payload = {
            id: user.id,
            email: user.email,
        };

        const secret = c.env.JWT_SECRET;

        const token = await sign(payload, secret);

        return c.json({ token });

    } catch (e) {
        c.status(403)
        return c.json({ error: "error while signing up" })
    }
});

user.post('/signin', async (c) => {
    const prisma = new PrismaClient({
        datasourceUrl: c.env.DATABASE_URL,
    }).$extends(withAccelerate())

    const body = await c.req.json();
    const {success} = signinInput.safeParse(body);

    if(!success){
        c.status(411);
        return c.json({
            message: 'wrong inputs'
        })
    }

    const user = await prisma.user.findUnique({
        where: {
            email: body.email,
            password: body.password,
        }
    })

    if (!user) {
        c.status(403);
        return c.json({ error: "Invalid credentials" });
    }

    const jwt = await sign({ id: user.id }, c.env.JWT_SECRET);
    return c.json({ jwt });
});

export default user;