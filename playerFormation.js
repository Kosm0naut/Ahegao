/*jslint devel: true, node: true, plusplus: true, nomen: true, bitwise: true*/
"use strict";

(function () {
    var Promise = require('promise'),
        playerFormation = require('./playerFormation'),
        today = new Date('1970-09-24 8:30:16'),
        calculations = require('./calculations.js');

    module.exports.setUser = function (id, message, userObj, osu, callback) {
        calculations.totalRequestsIncrement();
        osu.getUser(id, 1, function (err, obj) {
            if (err) {
                console.log(err);
            } else if (obj) {
                userObj._id = obj.user_id;
                userObj.name = obj.username;
                userObj.rank = obj.pp_rank;
                userObj.pp = obj.pp_raw;
                userObj.accuracy = parseFloat(obj.accuracy).toFixed(2);
                userObj.serverId[0] = message.id;
                if (userObj._id !== 0) {
                    callback();
                }
            }
        });
    };

    module.exports.setRecentScores = function (user, userObj, osu, callback) {
        calculations.totalRequestsIncrement();
        osu.getUserRecent(user, function (err, obj) {
            if (err) {
                //reject(err);
            } else if (obj) {
                try {
                    if (Object.keys(obj).length !== 0) {
                        playerFormation.setRecent(obj, function (entry) {
                            console.log(entry);
                            userObj.recentScore = entry;
                        });
                    }
                } catch (error) {
                    console.log(error);
                }
            }
        });
        callback();
    };

    module.exports.getTopScores = function (userId, osu) {
        return new Promise(function (fullfill, reject) {
            calculations.totalRequestsIncrement();
            osu.getUserBest(userId, function (err, obj) {
                if (err) {
                    reject(err);
                } else if (obj) {
                    var scoresArray = obj;
                    if (scoresArray.length !== 0) {
                        fullfill(scoresArray);
                    }
                }
            });
        });
    };

    module.exports.setRecent = function (obj) {
        var recentScore = {
            beatmapId: undefined,
            combo: undefined,
            count300: undefined,
            count100: undefined,
            count50: undefined,
            date: today.toISOString(),
            mapRank: undefined,
            mapMods: undefined
        };
        return new Promise(function (fullfill, reject) {
            recentScore.beatmapId = obj[0].beatmap_id;
            recentScore.combo = obj[0].maxcombo;
            recentScore.count300 = obj[0].count300;
            recentScore.count100 = obj[0].count100;
            recentScore.count50 = obj[0].count50;
            recentScore.date = obj[0].date;
            recentScore.mapRank = obj[0].rank;
            recentScore.mapMods = getMod(obj[0].enabled_mods);
            if (Object.keys(recentScore).length !== 0) {
                fullfill(recentScore);
            } else {
                reject();
            }
        });
    };

}());
