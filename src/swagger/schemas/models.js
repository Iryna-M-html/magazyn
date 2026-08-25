/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       required:
 *         - name
 *         - lastname
 *         - email
 *         - phone
 *         - password
 *         - role
 *       properties:
 *         _id:
 *           type: string
 *           description: Auto-generated user ID
 *           example: 64f0c2a9b9a1c2a1a1234567
 *         name:
 *           type: string
 *           description: User's first name
 *           example: John
 *         lastname:
 *           type: string
 *           description: User's last name
 *           example: Doe
 *         email:
 *           type: string
 *           format: email
 *           description: Unique email address
 *           example: john.doe@example.it
 *         phone:
 *           type: string
 *           description: Phone number in Italian format (+39XXXXXXXXXX)
 *           example: "+391234567890"
 *         city:
 *           type: string
 *           default: ""
 *           example: Rome
 *         avatar:
 *           type: string
 *           default: ""
 *           description: URL or string for avatar
 *           example: https://res.cloudinary.com/demo/image.jpg
 *         role:
 *           type: string
 *           enum:
 *             - operator
 *             - admin
 *             - manager
 *             - maintenanceWorker
 *             - safety
 *           default: operator
 *           description: User access level
 *           example: operator
 *         createdAt:
 *           type: string
 *           format: date-time
 *           example: 2026-02-09T12:00:00Z
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           example: 2026-02-09T12:00:00Z
 *
 *
 *     Session:
 *       type: object
 *       required:
 *         - userId
 *         - accessToken
 *         - refreshToken
 *         - accessTokenValidUntil
 *         - refreshTokenValidUntil
 *       properties:
 *         _id:
 *           type: string
 *           example: 65c3d4e5f6a7b8c9d0e1f2g3
 *         userId:
 *           type: string
 *           description: Reference to the User ID
 *           example: 64f0c2a9b9a1c2a1a1234567
 *         accessToken:
 *           type: string
 *           example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *         refreshToken:
 *           type: string
 *           example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *         accessTokenValidUntil:
 *           type: string
 *           format: date-time
 *         refreshTokenValidUntil:
 *           type: string
 *           format: date-time
 *
 *     Error:
 *       type: object
 *       properties:
 *         status:
 *           type: integer
 *           description: HTTP status code
 *           example: 400
 *         message:
 *           type: string
 *           description: Error message
 *           example: Invalid request parameters
 *         data:
 *           type: object
 *           description: Additional error details
 */
