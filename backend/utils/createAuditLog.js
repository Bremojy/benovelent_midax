const AuditLog =
require("../models/AuditLog");

module.exports = async ({

    user,

    userRole,

    action,

    module,

    description,

    req,

    metadata={},

    status="SUCCESS"

})=>{

    try{

        let userModel="Member";

        if(userRole==="admin")
            userModel="Admin";

        if(userRole==="superadmin")
            userModel="SuperAdmin";

        await AuditLog.create({

            user,

            userModel,

            userRole,

            action,

            module,

            description,

            ipAddress:
                req?.ip ||

                req?.headers["x-forwarded-for"] ||

                "",

            userAgent:
                req?.headers["user-agent"] || "",

            endpoint:
                req?.originalUrl || "",

            method:
                req?.method || "",

            metadata,

            status

        });

    }

    catch(error){

        console.error(
            "Audit Log Error:",
            error.message
        );

    }

};