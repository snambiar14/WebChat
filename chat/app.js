var express = require('express'),
    app = express(),
    server = require('http').createServer(app),
    io = require('socket.io').listen(server),
    mongoose = require('mongoose'),
    nicknames = [];
     
server.listen(3000);

mongoose.connect('mongodb://localhost/chat', function(err) {
    if(err){
        console.log(err);
    } else{
        console.log('Connected to mongodb!');
    }
});

var chatSchema = mongoose.Schema({
    nick: String,
    msg: String,
    created: {type: Date, default: Date.now}
});

var Chat = mongoose.model('Message', chatSchema);

app.get('/', function(req, res) {
    res.sendfile(__dirname + '/index.html');
});


io.sockets.on('connection', function(socket){
    var query = Chat.find({});
    query.sort('-created').limit(8).exec(function(err, docs){ 
        if(err) throw err;
        socket.emit('load old msgs', docs);
    });
    socket.on('new user', function(data, callback){
        if (nicknames.indexOf(data) != -1){
            callback(false);
        } else {
            callback(true);
            socket.nickname = data;
            nicknames.push(socket.nickname);
            updateNicknames(); 
        }
    });

    function updateNicknames() {
        io.sockets.emit('usernames', nicknames);
    }


    socket.on('send message', function(data){
        var newMsg = new Chat({msg: data, nick: socket.nickname});
        newMsg.save(function(err){
        if(err) throw err;
        io.sockets.emit('new message', {msg: data, nick: socket.nickname});
        });
    });

    socket.on('disconnect', function(data){
        if (!socket.nickname) return;
        nicknames.splice(nicknames.indexOf(socket.nickname), 1);
        updateNicknames();
    });
});
