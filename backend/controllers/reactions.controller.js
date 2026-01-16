import { asyncHandler } from "../middleware/asyncHandler";
import { prisma } from "../config/prisma";
import logger from "../config/logger";





export const likeEntity = asyncHandler(async (req, res) => {
    const userId = req.user.userId;
    const entityType = req.params.entityType;
    const entityId = parseInt(req.params.id);

    const validChoices = ['thread', 'comment']

    if (!validChoices.includes(entityType)) {
        return res.status(400).json({ message: 'Invalid entity type' });
    }

    const existingEntity = await prisma[entityType].findUnique({
        where: { id: entityId }
    });

    let existingLike;

    // Check if the user has already liked the thread or comment
    if (entityType === 'thread') {
        existingLike = await prisma.reaction.findUnique({
            where: {
                unique_user_thread_reaction: {
                    userId,
                    threadId: entityId
                }
            }
        })
    }

    if (entityType === 'comment') {
        existingLike = await prisma.reaction.findUnique({
            where: {
                unique_user_comment_reaction: {
                    userId,
                    commentId: entityId
                }
            }
        })
    }

    // Check if the entity exists
    if (!existingEntity) {
        return res.status(404).json({ message: 'Entity not found' });
    }

    // Check if the user is trying to like their own thread or comment
    if (existingEntity.userId === userId) {

        return res.status(403).json({ message: `You are not authorized to like your own ${entityType}` });
    }

    if (entityType === 'thread') {

        // Check if the user has already liked the thread
        // If the user has liked the thread, unlike the thread, else like it.
        if (existingLike) {
            await prisma.reaction.delete({
                where: {
                    unique_user_thread_reaction: {
                        userId,
                        threadId: entityId
                    }
                }

            })
            logger.info(`thread unliked`, { entityId, userId })

            return res.status(200).json({
                success: true,
                message: `thread unliked successfully`
            })
        } else {
            await prisma.reaction.create({
                data: {
                    userId,
                    threadId: entityId,
                }
            });
            logger.info(`thread liked`, { entityId, userId })
            return res.status(200).json({
                success: true,
                message: `thread liked successfully`
            })
        }
    }

    if (entityType === 'comment') {


        // Check if the user has already liked the comment
        // If the user has liked the comment, unlike the comment, else like it.
        if (existingLike) {
            await prisma.reaction.delete({
                where: {
                    unique_user_comment_reaction: {
                        userId,
                        commentId: entityId
                    }
                }
            })
            logger.info(`Comment unliked`, { entityId, userId })
            return res.status(200).json({
                success: true,
                message: `comment unliked successfully`
            })
        } else {
            await prisma.reaction.create({
                data: {
                    userId,
                    commentId: entityId
                }
            });
            logger.info("comment liked successfully", { entityId, userId })
            return res.status(200).json({
                success: true,
                message: `comment liked successfully`
            })
        }
    }



})


export const getEntityLikes = asyncHandler(async (req, res) => {
    const entityId = parseInt(req.params.id);
    const entityType = req.params.entityType;
    const entity = (entityType === 'thread' ? 'thread' : 'Comment');
    const existingEntity = await prisma[entityType].findUnique({
        where: { id: entityId }
    });
    if (!existingEntity) {
        return res.status(404).json({ message: `${entity} not found` });
    }
    const likes = await prisma.reaction.findMany({
        where: {
            entityId: entityId,
            entityType
        },
        include: {
            user: {
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
    return res.status(200).json({
        success: true,
        likes,
        entity,
        existingEntity
    })

})
