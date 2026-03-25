const pool = require("../config/db");


const FEATURE_PRICING = {
    7: 5000,
    14: 9000,
    30: 15000
};


// Add new property
exports.createProperty = async (req, res) => {
    try { 

        const {
            title,
            description,
            price,
            location,
            property_type,
            listing_type,
            bedrooms,
            bathrooms,
            area_sqft,
            image_url
        } = req.body;

        const userId = req.user.id;

        const newProperty = await pool.query(
            `INSERT INTO properties
            (title, description, price, location, property_type, listing_type, bedrooms, bathrooms, area_sqft, image_url, user_id, verification_status)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'pending')
            RETURNING *`,
            [
                title,
                description,
                price,
                location,
                property_type,
                listing_type,
                bedrooms,
                bathrooms,
                area_sqft,
                image_url,
                userId
            ]
        );

        const alertService = require("../services/alertService");

        res.status(201).json(newProperty.rows[0]);

        await alertService.checkSavedSearchMatches(newProperty.rows[0]);

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
    
};



// Get All Properties 
exports.getProperties = async (req, res) => {
    try {
        const {
            location,
            property_type,
            listing_type,
            minPrice,
            maxPrice,
            bedrooms,
            sort,
            page = 1,
            limit = 5
        } = req.query;

        const pageNumber = parseInt(page);
        const limitNumber = parseInt(limit);
        const offset = (pageNumber - 1) * limitNumber;

        let query = `SELECT * FROM properties WHERE verification_status = 'approved'`;
        let countQuery = `SELECT COUNT(*) FROM properties WHERE verification_status = 'approved'`;

        let values = [];
        let countValues = [];
        let index = 1;


        // Filtering Logic
        if (location) {
            query += ` AND location ILIKE $${index}`;
            countQuery += ` AND location ILIKE $${index}`;
            values.push(`%${location}%`);
            countValues.push(`%${location}%`);
            index++;
        }

        if (property_type) {
            query += ` AND property_type ILIKE $${index}`;
            countQuery += ` AND property_type ILIKE $${index}`;
            values.push(property_type);
            countValues.push(property_type);
            index++;
        }

        if (listing_type) {
            query += ` AND listing_type ILIKE $${index}`;
            countQuery += ` AND listing_type ILIKE $${index}`;
            values.push(listing_type);
            countValues.push(listing_type);
            index++;
        }

        if (minPrice && !isNaN(minPrice)) {
            query += ` AND price >= $${index}`;
            countQuery += ` AND price >= $${index}`;
            values.push(Number(minPrice));
            countValues.push(minPrice);
            index++;
        }

        if (maxPrice && !isNaN(maxPrice)) {
            query += ` AND price <= $${index}`;
            countQuery += ` AND price <= $${index}`;
            values.push(Number(maxPrice));
            countValues.push(maxPrice);
            index++;
        }

        if (bedrooms !== undefined) {
            query += ` AND bedrooms >= $${index}`;
            countQuery += ` AND bedrooms >= $${index}`;
            values.push(Number(bedrooms));
            countValues.push(Number(bedrooms));
            index++;
        }

        console.log("Final Query:", query);
        console.log("Values:", values); 

        //Sorting Logic
        if (sort === "price_low") {
            query += ` ORDER BY price ASC`;
        } else if (sort === "price_high") {
            query += ` ORDER BY price DESC`;
        } else {
            query += ` ORDER BY created_at DESC`; // default sorting (newest)
        }

        // Add Pagination
        query += ` LIMIT $${index} OFFSET $${index + 1}`;
        values.push(limitNumber, offset);

        // Get Total count
        const totalResult = await pool.query(countQuery, countValues);
        const total = parseInt(totalResult.rows[0].count);

        const totalPages = Math.ceil(total / limit);

        //Get filtered properties 
        const propertiesResult = await pool.query(query, values);

        res.status(200).json({
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages,
            data: propertiesResult.rows
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};




// Get single property
exports.getPropertyById = async (req, res) => {
    try {
        
        const propertyId = req.params.id;

        const property = await pool.query(
            "SELECT * FROM properties WHERE id=$1",
            [propertyId]
        );

        if (property.rows.length === 0) {
            return res.status(404).json({ message: "property not found" });
        }

        await pool.query(
            "UPDATE properties SET views = views + 1 WHERE id=$1",
            [propertyId]
        );

        res.json(property.rows[0]);

    } catch(error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};



// Update property
exports.updateProperty = async (req, res) => {
    try {
        const propertyId = req.params.id;

        const property = await pool.query(
            "SELECT * FROM properties WHERE id = $1",
            [propertyId]
        );

        if (property.rows.length === 0) {
            return res.status(404).json({ message: "Property not found" });
        }

        //Ownership check
        if (
            req.user.role !== "admin" &&
            property.rows[0].user_id !== req.user.id
        ) {
            return res.status(403).json({
                message: "You are not authorized to update this property"
            });
        }

        const{
            title,
            description,
            price,
            location,
            property_type,
            listing_type,
            bedrooms,
            bathrooms,
            area_sqft,
            image_url
        } = req.body;

        const updatedProperty = await pool.query(
            `UPDATE properties SET
            title=$1,
            description=$2,
            price=$3,
            location=$4,
            property_type=$5,
            listing_type=$6,
            bedrooms=$7,
            bathrooms=$8,
            area_sqft=$9,
            image_url=$10,
            verification_status='pending'
            WHERE id=$11
            RETURNING *`,
            [ 
                title,
                description,
                price,
                location,
                property_type,
                listing_type,
                bedrooms,
                bathrooms,
                area_sqft,
                image_url,
                propertyId
            ]
        );

        res.json(updatedProperty.rows[0]);

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};


// Add Trending for HomePage
exports.getHomepageProperties = async (req, res) => {
    try {

        const featured = await pool.query(
            `
            SELECT p.*
            FROM properties p
            JOIN featured_properties f ON p.id = f.property_id
            WHERE f.payment_status = 'paid'
            AND f.end_date > NOW()
            ORDER BY f.id DESC
            LIMIT 10
            `
        );

        const trending = await pool.query(
            `
            SELECT
            p.*,
            COALESCE(f.favorite_count,0) AS favorite_count,
            COALESCE(r.review_count,0) AS review_count
            FROM properties p
            LEFT JOIN (
            SELECT property_id, COUNT(*) AS favorite_count
            FROM favorites
            GROUP BY property_id
            ) f ON p.id = f.property_id
             
            LEFT JOIN (
            SELECT property_id, COUNT(*) AS review_count
            FROM reviews
            GROUP BY property_id
            ) r ON p.id = r.property_id
             WHERE p.verification_status = 'approved'
             ORDER BY (p.views + COALESCE(f.favorite_count,0)*2 + COALESCE(r.review_count,0)*3) DESC
             
             LIMIT 10
             `
        );

        const newest = await pool.query(
            `
            SELECT *
            FROM properties
            WHERE verification_status='approved'
            ORDER BY created_at DESC
            LIMIT 10
            `
        );

        res.json({
            featured: featured.rows,
            trending: trending.rows,
            newest: newest.rows
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};


//Featured/Sponsored properties
exports.featureProperty = async (req, res) => {
    try {

        const propertyId = req.params.id;
        const userId = req.user.id;
        const { duration } = req.body;

        const parsedDuration = parseInt(duration, 10);

        //Validate duration
        if (!FEATURE_PRICING[parsedDuration]) {
            return res.status(400).json({ message: "Invalid duration" });
        }

        const price = FEATURE_PRICING[parsedDuration];

        //Check if property belongs to agent
        const property = await pool.query(
            "SELECT * FROM properties WHERE id = $1 AND user_id = $2",
            [propertyId, userId]
        );

        if (property.rows.length === 0) {
            return res.status(403).json({ message: "Not authorized" });
        }

        // Create FEATURE REQUEST (pending payment)
        const result = await pool.query(
            `INSERT INTO featured_properties
            (property_id, user_id, duration_days, price, end_date, payment_status)
            VALUES ($1, $2, $3::INTEGER, $4, NOW() + ($3::INTEGER * INTERVAL '1 day'), 'pending')
            RETURNING *`,
            [propertyId, userId, parsedDuration, price]
        );

        res.json({
            message: "Feature request created. Proceed to payment.",
            data: result.rows[0]
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};


//Payment
exports.payForFeature = async (req, res) => {
    try {
        const featureId = req.params.id;
        const userId = req.user.id;

        const feature = await pool.query(
            "SELECT * FROM featured_properties WHERE id = $1 AND user_id = $2",
            [featureId, userId]
        );

        if (feature.rows.length === 0) {
            return res.status(404).json({ message: "Feature request not found" });
        }

        //Mark as paid
        await pool.query(
            "UPDATE featured_properties SET payment_status = 'paid' WHERE id = $1",
            [featureId]
        );

        //Notification
        const notificationService = require("../services/notificationService");

        await notificationService.createNotification({
            userId: userId,
            message: "Your property is now featured",
            type: "feature",
            referenceId: featureId
        });

        res.json({ message: "Payment successful. Property is now featured." });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};



exports.getRecommendedProperties = async (req, res) => {
    try {

        const propertyId = req.params.id;

        //Get current property
        const propertyResult = await pool.query(
            "SELECT * FROM properties WHERE id = $1",
            [propertyId]
        );

        if (propertyResult.rows.length === 0) {
            return res.status(404).json({ message: "Property not found" });
        }

        const property = propertyResult.rows[0];

        // Recommendation Logic
        const recommendations = await pool.query(
            `
            SELECT *
            FROM properties
            WHERE id != $1
            AND verification_status = 'approved'
            AND location = $2
            AND listing_type = $3
            AND property_type =$4
            AND price BETWEEN $5 * 0.7 AND $5 * 1.3
            ORDER BY views DESC
            LIMIT 6
            `,
            [
                propertyId,
                property.location,
                property.listing_type,
                property.property_type,
                property.price
            ]
        );

        res.json({
            property,
            recommendations: recommendations.rows
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};





// Booking Controller (Shortlet)
exports.createBooking = async (req, res) => {
    try {

        const userId = req.user.id;
        const propertyId = req.params.id;
        const { check_in, check_out } = req.body;

        // CHECK FOR CONFLICT
        const conflict = await pool.query(
            `
            SELECT * FROM bookings
            WHERE property_id = $1
            AND status IN ('pending', 'confirmed')
            AND check_in < $3
            AND check_out > $2
            `,
            [propertyId, check_in, check_out]
        );

        if (conflict.rows.length > 0) {
            return res.status(400).json({
                message: "Property already booked for selected dates"
            });
        }

        // Get property price
        const property = await pool.query(
            "SELECT price FROM properties WHERE id = $1",
            [propertyId]
        );

        if (property.rows.length === 0) {
            return res.status(404).json({ message: "Property not found" });
        }

        const pricePerDay = property.rows[0].price;

        //Calculate days
        const days = Math.ceil(
            (new Date(check_out) - new Date(check_in)) / (1000 * 60 * 60 * 24)
        );

        const totalPrice = days * pricePerDay;

        const booking = await pool.query(
            `
            INSERT INTO bookings (property_id, user_id, check_in, check_out, total_price)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
            `,
            [propertyId, userId, check_in, check_out, totalPrice]
        );


        const notificationService = require("../services/notificationService");

        //Notify user
        await notificationService.createNotification({
            userId,
            message: "Your booking has been created",
            type: "booking",
            referenceId: booking.rows[0].id
        });

        res.json({
            message: "Booking created",
            booking: booking.rows[0]
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};



// Pay for property Booking (Shortlet)
exports.payForBooking = async (req, res) => {
    try {
        const bookingId = req.params.id;
        const userId = req.user.id;

        const booking = await pool.query(
            "SELECT * FROM bookings WHERE id = $1 AND user_id = $2",
            [bookingId, userId]
        );

        if (booking.rows.length === 0) {
            return res.status(404).json({
                message: "Booking not found or not authorized"
        });
        }

        if (booking.rows[0].status === "confirmed") {
            return res.status(400).json({
                message: "Booking already paid for"
            });
        }

        await pool.query(
            "UPDATE bookings SET status = 'confirmed' WHERE id = $1",
            [bookingId]
        );


        const notificationService = require("../services/notificationService");

        //Notification
        await notificationService.createNotification({
            userId,
            message: "Your booking payment was successful",
            type: "payment",
            referenceId: bookingId
        });

        res.json({ message: "Booking payment successful" });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};






//CREATE room(Agent, Hotel)
exports.createRoom = async (req, res) => {
    try {
        const propertyId = req.params.id;
        const { room_type, price_per_night, total_rooms } = req.body;

        const room = await pool.query(
            `
            INSERT INTO rooms (property_id, room_type, price_per_night, total_rooms)
            VALUES ($1, $2, $3, $4)
            RETURNING *
            `,
            [propertyId, room_type, price_per_night, total_rooms]
        );

        res.json({
            message: "Room created",
            room: room.rows[0]
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};



//Book Hotel Room 
exports.bookRoom = async (req, res) => {
    try {
        const userId = req.user.id;
        const roomId = req.params.id;
        const { check_in, check_out, rooms_booked } = req.body;

        // Get room info
        const room = await pool.query(
            "SELECT * FROM rooms WHERE id = $1",
            [roomId]
        );

        if (room.rows.length === 0) {
            return res.status(404).json({ message: "Room not found" });
        }

        const roomData = room.rows[0];

        // Check availability
        const booked = await pool.query(
            `
            SELECT COALESCE(SUM(rooms_booked),0) AS total_booked
            FROM room_bookings
            WHERE room_id = $1
            AND status IN ('pending','confirmed')
            AND check_in < $3
            AND check_out > $2
            `,
            [roomId, check_in, check_out]
        );

        const totalBooked = parseInt(booked.rows[0].total_booked, 10);

        if(!rooms_booked || rooms_booked <= 0) {
            return res.status(400).json({
                message: "rooms_booked is required and must be greater than 0"
            });
        }

        if (totalBooked + rooms_booked > roomData.total_rooms) {
            return res.status(400).json({
                message: "Not enough rooms available"
            });
        }

        // Calculate price
        const days = Math.ceil(
            (new Date(check_out) - new Date(check_in)) / (1000 * 60 * 60 * 24)
        );

        const totalPrice = days * roomData.price_per_night * rooms_booked;

        const booking = await pool.query(
            `
            INSERT INTO room_bookings
            (room_id, user_id, check_in, check_out, rooms_booked, total_price)
            VALUES ($1,$2,$3,$4,$5,$6)
            RETURNING *
            `,
            [roomId, userId, check_in, check_out, rooms_booked, totalPrice]
        );

        res.json({
            message: "Room booked successfully",
            booking: booking.rows[0]
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};


//Hotel Payment
exports. payForRoomBooking = async (req, res) => {
    try {
        const bookingId = req.params.id;

        const userId = req.user.id;

        // Check booking exists + belongs to user
        const booking = await pool.query(
            "SELECT * FROM room_bookings WHERE id = $1 AND user_id = $2",
            [bookingId, userId]
        );

        if (booking.rows.length === 0) {
            return res.status(404).json({
                message: "Booking not found or not authorized"
            });
        }

        // Prevent double payment
        if(booking.rows[0].status === "confirmed") {
            return res.status(400).json({
                message: "Booking already paid"
            });
        }

        //Update
        await pool.query(
            "UPDATE room_bookings SET status = 'confirmed' WHERE id = $1",
            [bookingId]
        );

        const notificationService = require("../services/notificationService");

        await notificationService.createNotification({
            userId,
            message: "Your hotel booking is confirmed",
            type: "payment",
            referenceId: bookingId
        });

        res.json({ message: "Room booking confirmed" });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};



// Land Verification Request
exports.requestLandVerification = async (req, res) => {
    try {
        const userId = req.user.id;
        const propertyId = req.params.id;

        const { document_url, document_type, document_number } = req.body;

        //Check property exists
        const property = await pool.query(
            "SELECT * FROM properties WHERE id = $1",
            [propertyId]
        );

        if (property.rows.length === 0) {
            return res.status(404).json({
                message: "Property not found"
            });
        }


        // Prevent duplicate verification request
        const existing = await pool.query(
            "SELECT * FROM land_verifications WHERE property_id = $1",
            [propertyId]
        );

        if (existing.rows.length > 0) {
            return res.status(400).json({
                message: "Verification already requested for this property"
            });
        }

        if (!document_type || !document_number) {
            return res.status(400).json({
                message: "document_type and document_number are required"
            });
        }

        
        //Prevent duplicate document fraud
        if (document_number) {
            const duplicateDoc = await pool.query(
                "SELECT * FROM land_verifications WHERE document_number = $1",
                [document_number]
            );

            if (duplicateDoc.rows.length > 0) {
                return res.status(400).json({
                    message: "This document has already been used"
                });
            }
        }


        //Create verification request
        const result = await pool.query(
            `
            INSERT INTO land_verifications
            (property_id, user_id, document_url, document_type, document_number, status)
            VALUES ($1, $2, $3, $4, $5, 'pending')
            RETURNING *
            `,
            [propertyId, userId, document_url, document_type, document_number]
        );

        // Update property status (pending)
        await pool.query(
            `
            UPDATE properties
            SET land_verification_status = 'pending'
            WHERE id = $1
            `,
            [propertyId]
        );

        res.status(201).json({
            message: "Land verification request submitted",
            data: result.rows[0]
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};


// Admin Review
exports.reviewLand = async (req, res) => {
    try {
        const verificationId = req.params.id;
        const adminId = req.user.id;

        const { status, admin_note } = req.body;

        //Validate status
        const validStatuses = ["verified", "rejected"];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                message: "Invalid status"
            });
        }

        //Get verification record
        const verification = await pool.query(
            "SELECT * FROM land_verifications WHERE id = $1",
            [verificationId]
        );

        if (verification.rows.length === 0) {
            return res.status(404).json({
                message: "Verification request not found"
            });
        }


        //Lock admin review
        if (verification.rows[0].payment_status !== "paid") {
            return res.status(400).json({
                message: "Verification not paid"
            });
        }

        const propertyId = verification.rows[0].property_id;


        //Update verification table
        await pool.query(
            `
            UPDATE land_verifications
            SET status = $1,
            admin_note = $2,
            reviewed_by = $3,
            reviewed_at = NOW()
            WHERE id = $4
            `,
            [status, admin_note, adminId, verificationId]
        );


        // Update property verification status
        await pool.query(
            `
            UPDATE properties
            SET land_verification_status = $1
            WHERE id = $2
            `,
            [status, propertyId]
        );

        const notificationService = require("../services/notificationService");

        const ownerId = verification.rows[0].user_id;

        await notificationService.createNotification({
            userId: ownerId,
            message: `Your land verification was ${status}`,
            type: "land",
            referenceId: propertyId
        });

        res.json({
            message: `Land marked as ${status}`
        });
       

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};


exports.payForLandVerification = async (req, res) => {
    try {
        const verificationId = req.params.id;
        const userId = req.user.id;

        const verification = await pool.query(
            "SELECT * FROM land_verifications WHERE id = $1 AND user_id = $2",
            [verificationId, userId]
        );

        if (verification.rows.length === 0) {
            return res.status(404).json({
                message: "Verification request not found"
            });
        }

        if (verification.rows[0].payment_status === "paid") {
            return res.status(400).json({
                message: "Already paid"
            });
        }

        await pool.query(
            "UPDATE land_verifications SET payment_status = 'paid' WHERE id = $1",
            [verificationId]
        );

        res.json({
            message: "Verification payment successful"
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" })
    }
};





// Agent Dashboard
exports.getAgentProperties = async (req, res) => {

    try {
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 5;
        const offset = (page - 1) * limit;

        const agentId = req.user.id;

        const query = `
        SELECT * FROM properties
        WHERE user_id = $1
        ORDER BY created_at DESC 
        LIMIT $2 OFFSET $3
        `;

        const countQuery = `
        SELECT COUNT(*) FROM properties
        WHERE user_id = $1
        `;

        const properties = await pool.query(query, [agentId, limit, offset]);
        const total = await pool.query(countQuery, [agentId]);

        const totalProperties = Number(total.rows[0].count);
        const totalPages = Math.ceil(totalProperties / limit);

        res.json({
            total: totalProperties,
            page,
            limit,
            totalPages,
            data: properties.rows
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};


// Get Agent Dashboard
exports.getAgentDashboardStats = async (req, res) => {
    
    try {
        const agentId = req.user.id;

        const stats = await pool.query(
            ` SELECT 
            COUNT(*) AS total,
            COUNT(*) FILTER (WHERE verification_status='approved') AS approved,
            COUNT(*) FILTER (WHERE verification_status='pending') AS pending,
            COUNT(*) FILTER (WHERE verification_status='rejected') AS rejected
            FROM properties
            WHERE user_id=$1
            `, [agentId]
        );

        res.json({
            total_properties: stats.rows[0].total,
            approved: stats.rows[0].approved,
            pending: stats.rows[0].pending,
            rejected: stats.rows[0].rejected
        });


    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });

    }
};



// DELETE 
exports.deleteProperty = async (req, res) => {
    try{
        const propertyId = req.params.id;

        // 1. Find property first
        const property = await pool.query(
            "SELECT * FROM properties WHERE id = $1",
            [propertyId]
        );

        if (property.rows.length === 0) {
            return res.status(404).json({ message: "Property not found" });
        }

        const existingProperty = property.rows[0];


        console.log("Logged in user:", req.user);
        console.log("Property owner:", existingProperty.user_id);

// 2. Check ownership   OR admin
        if (
            req.user.role !== "admin" &&
            Number(existingProperty.user_id) !== Number(req.user.id)
        ) {
            return res.status(403).json({
                message: "You are not authorized to delete this property",
            });
        }

        // 3. Delete
        await pool.query(
            "DELETE FROM properties WHERE id = $1",
            [req.params.id]
        );

        res.json({ message: "Property deleted successfully" }); 

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};


// Report Property Function
exports.reportProperty = async (req, res) => {
    try {
         
        const propertyId = req.params.id;
        const reportedBy = req.user.id;

        const { reason, description } = req.body;

        const property = await pool.query(
            "SELECT id FROM properties WHERE  id=$1",
            [propertyId]
        );
        if(property.rows.length === 0){
            return res.status(404).json({
                message: "Property not found"
            });
        }

        const report = await pool.query(
            ` INSERT INTO reports (property_id, reported_by, reason, description)
            VALUES ($1,$2,$3,$4)
            RETURNING *`,
            [propertyId, reportedBy, reason, description]
        );

        res.status(201).json({
            message: "Property reported successfully",
            report: report.rows[0]
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Server error"
        });
    }
};


//Add Images
exports.addPropertyImage = async (req, res) => {
    try{

        const propertyId = req.params.id;
        const { image_url } = req.body;

        const property = await pool.query(
            "SELECT * FROM properties WHERE id=$1",
            [propertyId]
        );

        if (property.rows.length === 0) {
            return res.status(404).json({
                message: "Property not found"
            });
        }

        const newImage = await pool.query(
            `INSERT INTO property_image (property_id, image_url)
            VALUES ($1,$2)
            RETURNING *`,
            [propertyId, image_url]
        );

        res.status(201).json({
            message: "Image added successfully",
            image: newImage.rows[0]
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Server error"
        });
    }
};


exports.getPropertyImages = async (req, res) => {
    try {

        const propertyId = req.params.id;

        const images = await pool.query(
            "SELECT * FROM property_image WHERE property_id=$1",
            [propertyId]
        );

        res.json(images.rows);

    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Server error"
        });
    }
};