import express from 'express'
import dotenv from 'dotenv'
import pool from './config/db'
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