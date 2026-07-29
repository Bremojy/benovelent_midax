const onlineUsers = new Map();

exports.addUser = (userId, socketId) => {

    onlineUsers.set(userId.toString(), socketId);

};

exports.removeUser = (socketId) => {

    for (const [userId, id] of onlineUsers.entries()) {

        if (id === socketId) {

            onlineUsers.delete(userId);

            break;

        }

    }

};

exports.getSocket = (userId) => {

    return onlineUsers.get(userId.toString());

};

exports.getUsers = () => {

    return [...onlineUsers.keys()];

};