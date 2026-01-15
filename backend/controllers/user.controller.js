import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function getMyInfo(req, res) {
    const userId = req.user.userId
    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
            profile: {
                select: {
                    firstName: true,
                    lastName: true,
                    bio: true,
                    photoUrl: true
                }
            }
        }
    })

    if (user) {
        return res.status(200).json({
            username: user.username,
            email: user.email,
            type: user.type,
            firstName: user.profile?.firstName,
            lastName: user.profile?.lastName,
            bio: user.profile?.bio,
            photoUrl: user.profile?.photoUrl
        })
    } else {
        return res.status(404).json({ message: "user not found" })
    }

}

async function updateMyInfo(req, res) {

    const userId = req.user.userId;

    const { firstName, lastName, bio, email, username, photoUrl } = req.body

    try {
        const user = await prisma.user.update({
            where: {
                id: userId
            },
            data: {
                email,
                username,
                profile: {
                    update: {
                        firstName,
                        lastName,
                        bio,
                        photoUrl
                    }
                }
            },
            include: {
                profile: true
            }
        })

        return res.status(200).json({ message: "Updated.", updatedUser: user })
    } catch (error) {

        return res.status(400).json({ message: error.message })
    }

}

async function getUser(req, res) {

    const userId = Number(req.params.userId)

    try {
        const user = await prisma.user.findUnique({
            where: {
                id: userId
            },
            select: {
                id: true,
                username: true,
                type: true,
                profile: {
                    select: {
                        firstName: true,
                        lastName: true,
                        bio: true,
                        photoUrl: true
                    }
                }
            }
        })

        if (user) {
            return res.status(200).json({ user })
        } else {
            return res.status(404).json({ message: "user not found" })
        }
    } catch (error) {
        return res.status(400).json({ message: error.message })
    }



}

async function getFollowers(req, res) {
    const userId = req.user.userId

    try {
        const followers = await prisma.follow.findMany({
            where: {
                followedId: userId,
                status: 'ACCEPTED'
            },
            select: {
                follower: {
                    select: {
                        id: true,
                        username: true,
                        profile: {
                            select: {
                                firstName: true,
                                lastName: true,
                                photoUrl: true
                            }
                        }
                    }
                }
            }
        })

        if (followers.length === 0) {
            return res.status(200).json({ message: "You have no followers yet." })
        } else {
            const followersData = followers.map(f => f.follower)
            return res.status(200).json({ followersData })
        }
    } catch (error) {
        return res.status(400).json({ message: error.message })
    }

}

async function getFollowed(req, res) {

    const userId = req.user.userId;

    try {
        const followedRecord = await prisma.follow.findMany({
            where: {
                followerId: userId,
                status: 'ACCEPTED'
            },
            select: {
                followed: {
                    select: {
                        id: true,
                        username: true,
                        profile: {
                            select: {
                                firstName: true,
                                lastName: true,
                                photoUrl: true
                            }
                        }
                    }
                }
            }

        })

        if (followedRecord.length === 0) {
            return res.status(200).json({ message: "You are not following any accounts" })
        } else {

            const followedAccounts = followedRecord.map(f => f.followed)

            return res.status(200).json({ followedAccounts })
        }
    } catch (error) {
        return res.status(500).json({ message: error.message })
    }

}

async function follow(req, res) {

    const followedId = Number(req.params.followed)
    const followerId = req.user.userId

    // Prevent self-follow
    if (followerId === followedId) {
        return res.status(400).json({ message: "You cannot follow yourself" })
    }

    const followedUser = await prisma.user.findUnique({
        where: {
            id: followedId
        },
        include: {
            profile: {
                select: {
                    firstName: true,
                    lastName: true
                }
            }
        }
    })

    if (!followedUser) {
        return res.status(404).json({ message: "User not found" })
    }

    // Check if already following
    const existingFollow = await prisma.follow.findUnique({
        where: {
            followerId_followedId: {
                followerId,
                followedId
            }
        }
    })

    if (existingFollow) {
        return res.status(400).json({ message: "You are already following this user" })
    }

    const accountType = followedUser.type;

    try {
        const followUser = await prisma.follow.create({
            data: {
                followedId,
                followerId,
                status: accountType === 'PRIVATE' ? 'PENDING' : 'ACCEPTED'
            }
        })

        return res.status(201).json({
            message: accountType === 'PRIVATE' ? 'You have sent a request to the user' : 'You followed this user',
            followedUser: {
                username: followedUser.username,
                firstName: followedUser.profile?.firstName,
                lastName: followedUser.profile?.lastName
            }
        })
    } catch (error) {
        return res.status(500).json({ message: error.message })
    }

}

async function unfollow(req, res) {

    const followerId = req.user.userId
    const followedId = Number(req.params.followed)

    try {
        const unfollowUser = await prisma.follow.delete({
            where: {
                followerId_followedId: {
                    followerId,
                    followedId
                }
            }
        })

        return res.status(200).json({ message: "You unfollowed this user" })
    } catch (error) {
        return res.status(500).json({ message: error.message })
    }

}

async function removeFollower(req, res) {

    const followerId = Number(req.params.follower)
    const followedId = req.user.userId

    try {
        const removeFollower = await prisma.follow.delete({
            where: {
                followerId_followedId: {
                    followerId,
                    followedId
                }
            }
        })

        return res.status(200).json({ message: "You removed this user from your followers" })
    } catch (error) {
        return res.status(500).json({ message: error.message })
    }

}

async function updateRequest(req, res) {

    const followerId = Number(req.params.follower)
    const followedId = req.user.userId

    const isAccepted = req.body.isAccepted

    try {
        const updateRequest = await prisma.follow.update({
            where: {
                followerId_followedId: {
                    followerId,
                    followedId
                }
            },
            data: { status: isAccepted ? 'ACCEPTED' : 'REFUSED' }
        })

        return res.status(200).json({ message: "You updated this request" })
    } catch (error) {
        return res.status(500).json({ message: error.message })
    }

}

async function getMyThreads(req, res) {

    const userId = req.user.userId

    try {
        const myThreads = await prisma.thread.findMany({
            where: {
                userId
            },
            include: {
                user: {
                    select: {
                        username: true,
                        profile: {
                            select: {
                                firstName: true,
                                lastName: true,
                                photoUrl: true
                            }
                        }
                    }
                },
                media: true
            },
            orderBy: {
                createdAt: 'desc'
            }
        })

        return res.status(200).json({ myThreads })
    } catch (error) {
        return res.status(500).json({ message: error.message })
    }

}

async function updateProfile(req, res) {
    const userId = req.user.userId
    const { firstName, lastName, bio } = req.body

    try {
        const updatedProfile = await prisma.profile.update({
            where: { userId },
            data: { firstName, lastName, bio }
        })

        return res.status(200).json({ message: "Profile updated.", profile: updatedProfile })
    } catch (error) {
        return res.status(400).json({ message: error.message })
    }
}


async function updateProfilePicture(req, res) {
    const userId = req.user.userId
    const { photoUrl } = req.body

    try {
        const updatedProfile = await prisma.profile.update({
            where: { userId },
            data: { photoUrl }
        })

        return res.status(200).json({ message: "Profile picture updated.", profile: updatedProfile })
    } catch (error) {
        return res.status(400).json({ message: error.message })
    }
}


export {
    getMyInfo,
    updateMyInfo,
    getUser,
    follow,
    unfollow,
    removeFollower,
    getFollowers,
    getFollowed,
    updateRequest,
    getMyThreads,
    updateProfile,
    updateProfilePicture
};