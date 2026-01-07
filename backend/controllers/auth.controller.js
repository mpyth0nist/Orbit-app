import { PrismaClient } from "@prisma/client";
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'


const prisma = new PrismaClient()

async function register(req, res){

    const {firstName, lastName, username, email, password} = req.body;
    const userExists = await prisma.user.findFirst({
        where: {
            OR: [{ username }, { email }]
        }
    })
    if(userExists){
        return res.status(400).json({ message : "User already exists "} )
    } else {

        try {

            const saltRounds = 10;
            const hashedPassword = await bcrypt.hash(password, saltRounds)
            const newUser = await prisma.user.create({
                data : {firstName, lastName, username, email, passwordHash: hashedPassword}
            })

            return res.status(201).json({ message : "User Registered Successfully" })

        }catch(err){
            return res.status(500).json({ message: err.message })
        }

    }
    
}

async function login(req, res){

    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
        where: { email }
    })

    if(!user){

        return res.status(404).json({ message : "Invalid email or password" });

    }else {

        const isValid = await bcrypt.compare(password, user.passwordHash)
        if(isValid){
            const payload = {
                userId : user.id,
                email,
                generatedBy : "typing"
            }

            const secretKey = process.env.JWT_SECRET

            const token = jwt.sign(payload, secretKey, {
                expiresIn: "1h"
            })

            return res.status(200).json({ message : "Logged In.",
                token : token
             })

        }else{
            
            return res.status(400).json({ message : "Invalid email or password"})
        }
    }

}

export {login, register};