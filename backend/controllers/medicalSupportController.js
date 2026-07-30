// ======================================================
// GET ALL MEDICAL APPLICATIONS (ADMIN)
// GET /api/medical/admin/applications
// ======================================================

exports.getAllApplications = async (req,res)=>{

    try{

        const applications =
        await MedicalSupport.find()

        .populate(
            "member",
            "memberNumber fullName phone"
        )

        .populate(
            "dependent",
            "fullName relationship"
        )

        .populate(
            "approvedBy",
            "fullName"
        )

        .sort({
            createdAt:-1
        });


        res.json({

            success:true,

            total:applications.length,

            applications

        });


    }
    catch(error){

        res.status(500).json({

            success:false,

            message:error.message

        });

    }

};



// ======================================================
// MEDICAL SUPPORT SUMMARY (ADMIN DASHBOARD)
// GET /api/medical/admin/summary
// ======================================================

exports.getMedicalSummary = async(req,res)=>{

    try{


        const total =
        await MedicalSupport.countDocuments();



        const pending =
        await MedicalSupport.countDocuments({

            status:"Pending"

        });



        const underReview =
        await MedicalSupport.countDocuments({

            status:"Under Review"

        });



        const approved =
        await MedicalSupport.countDocuments({

            status:"Approved"

        });



        const rejected =
        await MedicalSupport.countDocuments({

            status:"Rejected"

        });



        const paid =
        await MedicalSupport.countDocuments({

            status:"Paid"

        });



        const approvedAmount =
        await MedicalSupport.aggregate([

            {
                $match:{
                    status:{
                        $in:[
                            "Approved",
                            "Paid"
                        ]
                    }
                }
            },


            {
                $group:{

                    _id:null,

                    total:{
                        $sum:"$approvedAmount"
                    }

                }
            }

        ]);



        res.json({

            success:true,

            summary:{

                total,

                pending,

                underReview,

                approved,

                rejected,

                paid,

                approvedAmount:
                approvedAmount[0]?.total || 0

            }

        });


    }
    catch(error){

        res.status(500).json({

            success:false,

            message:error.message

        });

    }

};




// ======================================================
// APPROVE MEDICAL APPLICATION
// PUT /api/medical/admin/approve/:id
// ======================================================

exports.approveApplication = async(req,res)=>{

    try{


        const {

            approvedAmount,

            remarks

        } = req.body;



        const application =
        await MedicalSupport.findById(

            req.params.id

        );



        if(!application){

            return res.status(404).json({

                success:false,

                message:"Application not found."

            });

        }



        application.status =
        "Approved";


        application.approvedAmount =
        approvedAmount ||
        application.requestedAmount;


        application.approvedBy =
        req.user._id;


        application.processedBy =
        req.user._id;


        application.approvalDate =
        new Date();


        application.remarks =
        remarks;



        await application.save();



        await createNotification({

            recipient:
            application.member,

            sender:
            req.user._id,


            title:
            "Medical Support Approved",


            message:
            "Your medical support application has been approved.",


            type:
            "medical",


            referenceId:
            application._id,


            referenceModel:
            "MedicalSupport",


            icon:
            "check_circle"

        });



        res.json({

            success:true,

            message:
            "Medical application approved successfully.",

            application

        });


    }
    catch(error){

        res.status(500).json({

            success:false,

            message:error.message

        });

    }

};




// ======================================================
// REJECT MEDICAL APPLICATION
// PUT /api/medical/admin/reject/:id
// ======================================================

exports.rejectApplication = async(req,res)=>{

    try{


        const {

            rejectionReason

        } = req.body;



        const application =
        await MedicalSupport.findById(

            req.params.id

        );



        if(!application){

            return res.status(404).json({

                success:false,

                message:"Application not found."

            });

        }



        application.status =
        "Rejected";


        application.rejectionReason =
        rejectionReason;


        application.processedBy =
        req.user._id;


        await application.save();




        await createNotification({

            recipient:
            application.member,


            sender:
            req.user._id,


            title:
            "Medical Support Rejected",


            message:
            `Your medical support request was rejected. Reason: ${rejectionReason}`,


            type:
            "medical",


            referenceId:
            application._id,


            referenceModel:
            "MedicalSupport",


            icon:
            "cancel"

        });



        res.json({

            success:true,

            message:
            "Medical application rejected.",

            application

        });



    }
    catch(error){

        res.status(500).json({

            success:false,

            message:error.message

        });

    }

};