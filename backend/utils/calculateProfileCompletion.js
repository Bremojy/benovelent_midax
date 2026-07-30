const calculateProfileCompletion = (member) => {

    const requiredFields = [

        "fullName",
        "memberNumber",
        "phone",
        "email",
        "nationalId",
        "gender",
        "dateOfBirth",
        "maritalStatus",
        "county",
        "subCounty",
        "ward",
        "postalAddress",
        "physicalAddress",
        "occupation",
        "nextOfKinName",
        "nextOfKinPhone",
        "nextOfKinRelationship",
        "profileImage"

    ];

    let completed = 0;

    requiredFields.forEach(field => {

        if (
            member[field] !== undefined &&
            member[field] !== null &&
            member[field] !== ""
        ) {
            completed++;
        }

    });

    return {

        completed,

        total: requiredFields.length,

        percentage: Math.round(
            (completed / requiredFields.length) * 100
        )

    };

};

module.exports = calculateProfileCompletion;