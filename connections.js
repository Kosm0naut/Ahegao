/*jslint devel: true, node: true, plusplus: true, nomen: true, bitwise: true*/
"use strict";

(function () {
    var MongoClient = require('mongodb').MongoClient,
        Promise = require('promise'),
        dotenv = require('dotenv').config(),
        loginToken = process.env.discordToken;

    module.exports.loginWithToken = function (mybot) {
        mybot.login(loginToken)
            .then(console.log("Bot logged in successfully"))
            .catch(function (e) {
                console.log(e);
            });
    };

    module.exports.loginToDatabase = function () {
        return new Promise(function (fullfill, reject) {
            MongoClient.connect("mongodb://localhost:27017/DiscordBot", function (err, database) {
                if (err) {
                    reject(err);
                } else {
                    fullfill(database);
                }
                console.log("Db connected");
              // Pradedamas vykdyti  /*global botStart*/
              //  botStart();
            });
        });
    };
}());
