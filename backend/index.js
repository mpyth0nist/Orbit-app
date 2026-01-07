import express from 'express'
import 'dotenv/config'
import cors from 'cors'
import authRoutes from './routes/auth.routes.js'
import userRoutes from './routes/user.routes.js'
const app = express()
const port = process.env.PORT


// middlewares
app.use(express.json())
app.use(cors())

// routes
app.use('/api/auth/', authRoutes)
app.use('/api/user/', userRoutes)


// TESTING DB CONNECTION



// error handling

app.listen(port, () => {
    console.log('Server is running on port: ', port)
})