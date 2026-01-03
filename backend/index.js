import express from 'express'
import dotenv from 'dotenv'
import cors from 'cors'
import pool from './config/db.js'
dotenv.config()
const app = express()
const port = process.env.PORT

// middlewares
app.use(express.json())
app.use(cors)

// routes


// error handling

app.listen(port, () => {
    console.log('Server is running on port: ', port)
})