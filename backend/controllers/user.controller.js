import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function getMyInfo(req, res){
    const userId = req.user.userId
    const user = await prisma.user.findUnique({
        where: { id : userId }
    })

    if(user){
        return res.status(200).json({
            firstName : user.firstName,
            lastName : user.lastName,
            email: user.email
        })
    }else{
        return res.status(404).json({ message : "user not found"})
    }

}

async function updateMyInfo(req, res){

    const userId = req.user.userId;

    const updateData = req.body

    try {
        const user = await prisma.user.update({
            where:{
                id: userId
            },
            data:{
                ...updateData
            }
        })

        return res.status(200).json({ message : "Updated.", updatedUser : user })
    }catch(error){

        return res.status(400).json({ message : error.message })
    }

}

async function getUser(req,res){

}

async function getFollowers(req, res){
    const userId = req.user.userId

    try{
        const followers = await prisma.follow.findMany({
            where:{
                followedId : userId
            },
            select: {
                follower : {
                    select : {
                        username : true,
                        firstName : true,
                        lastName : true
                    }
                }
            }
        })
       
        if(followers.length === 0){
            return res.status(200).json({ message : "You have no followers yet." })
        }else {
            

            const followersData = followers.map(f => f.follower)
            return res.status(200).json({ followersData })
        }
    }catch(error){
        return res.status(400).json({ message : error.message })
    }

    


    
}

async function getFollowed(req, res){

}

async function follow(req, res){

    console.log(req.params)
    const followedId = Number(req.params.followed)
    const followerId = req.user.userId
    const followedUser = await prisma.user.findUnique({
        where: {
            id : followedId
        }
    })

    if (followedUser){

        const accountType = followedUser.type;

            try {
                const followUser = await prisma.follow.create({
                    data:{
                            followedId,
                            followerId,
                            status : accountType === 'PRIVATE' ? 'PENDING' : 'ACCEPTED'
                        }
                })

                return res.status(201).json({ message : accountType ==='PRIVATE' ? 'You have sent a request to the user': 'You followed this user' , followedUser: { 
                    firstName : followedUser.firstName, 
                    lastName : followedUser.lastName,
                    username : followedUser.username
                 }})
            }catch(error){
                return res.status(500).json({ message : error.message })
            }
            

    }

}

async function unfollow(req, res){

}


async function updateRequest(req, res){

}

async function getMyThreads(req, res){

}

export { getMyInfo, updateMyInfo, follow, getFollowers };