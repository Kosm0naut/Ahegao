/*jslint devel: true, node: true, plusplus: true, nomen: true, bitwise: true*/
"use strict";

(function () {
    var Promise = require('promise'),
        calculations = require('./calculations'),
        playerManagement = require('./playerManagement'),
        scoreManagement = require('./scoreManagement'),
        beatmapManagement = require('./beatmapManagement.js'),
        messageManagement = require('./messageManagement.js'),
        getRecentScoresCallback = function () {
            return function () {
                console.log("Getting user recent scores");
            };
        };

    module.exports.updateRecentScores = function (id, beatmapId, combo, count300, count100, count50, date, mapRank, mapMods, db, callback) {
        db.collection('user').updateOne(
            { "_id" : id },
            {
                $set: {
                    "recentScore.beatmapId": beatmapId,
                    "recentScore.combo": combo,
                    "recentScore.count300": count300,
                    "recentScore.count100": count100,
                    "recentScore.count50": count50,
                    "recentScore.date": date,
                    "recentScore.mapRank": mapRank,
                    "recentScore.mapMods": mapMods
                },
            },
            function (err, results) {
                if (err) {
                    console.log(err);
                } else if (results) {
                    callback();
                }
            }
        );
    };

    module.exports.getRecentScores = function (channel) {
        var i = 0;
        return new Promise(function (fullfill, reject) {
            playerManagement.getUserObj(channel)
                  .then(function (res) {
                    if (res.length !== 0) {
                        for (i; i < res.length; i++) {
                            /*global retrieveMostRecent*/
                            scoreManagement.retrieveMostRecent(res[i], getRecentScoresCallback());
                        }
                    } else {
                        channel.sendMessage("No users were found for this channel.");
                    }
                }).catch(function (err) {
                    reject(err);
                });
            fullfill();
        });
    };

    module.exports.checkTopScores = function (userObj, osu, callback) {
        var array = [], index = [];
        //avgRequests.requestsTotal++;
        osu.getUserBest(userObj._id, function (err, res) {
            if (err) {
                console.log(err);
            } else {
                res.forEach(function (entry, i) {
                    userObj.topScores.forEach(function (scoresEntry, j) {
                        if (i === j && (scoresEntry.date !== entry.date)) {
                            array.push(entry);
                            index.push(i);
                        }
                    });
                });
                callback(array[0], index[0], res);
            }
        });
    };

    module.exports.updateTopScores = function (newTopScores, callback) {
        var index = 0, arr = [];
        newTopScores.forEach(function (topScore, indexas) {
            index++;
            arr.push(scoreManagement.formTopScore(topScore.beatmap_id, topScore.count300, topScore.count100, topScore.count50, topScore.countmiss, calculations.getMod(topScore.enabled_mods), topScore.rank, topScore.date, topScore.pp));
        });
        if (index === newTopScores.length) {
            callback(arr);
        }
    };

    module.exports.formTopScore = function (beatmapId, count300, count100, count50, countmiss, enabled_mods, mapRank, date, mapPp) {
        var score = {
            beatmapId: undefined,
            count300: undefined,
            count100: undefined,
            count50: undefined,
            countmiss: undefined,
            enabled_mods: undefined,
            mapRank: undefined,
            date: undefined,
            mapPp: undefined
        };
        score.beatmapId = beatmapId;
        score.count300 = count300;
        score.count100 = count100;
        score.count50 = count50;
        score.countmiss = countmiss;
        score.enabled_mods = calculations.getMod(enabled_mods);
        score.mapRank = mapRank;
        score.date = date;
        score.mapPp = mapPp;

        return score;
    };

    module.exports.pushTopScores = function (userObj, arr, db, callback) {
        db.collection('user').update(
            { "_id" : userObj._id },
            {
                $set: {
                    topScores: arr
                }
            },
            function (err, results) {
                if (err) {
                    console.log(err);
                } else if (results) {
                    callback(results);
                }
            }
        );
    };

    module.exports.retrieveMostRecent = function (user, osu, db, mybot, callback) {
        //avgRequests.requestsTotal++;
        osu.getUserRecent(user._id, function (err, obj) {
            if (err) {
                console.log("Error retrieving latest scores array: " + err);
            } else if (obj) {
                try {
                    if (Object.keys(obj).length !== 0) {
                        if (user.recentScore.date < obj[0].date) {
                            scoreManagement.updateRecentScores(user._id, obj[0].beatmap_id, obj[0].maxcombo, obj[0].count300, obj[0].count100, obj[0].count50, obj[0].date, obj[0].rank, calculations.getMod(obj[0].enabled_mods), db, function () {
                                //console.log("Done updating recent scores.");
                            });
                            /*global getAcc*/
                            var calculatedAcc = parseFloat(calculations.getAcc(obj[0].count300, obj[0].count100, obj[0].count50, obj[0].countmiss)).toFixed(2);
                            /*global getBeatmapData*/
                            beatmapManagement.getBeatmapData(obj[0].beatmap_id, osu, function (bMap) {
                                if (obj[0].rank !== 'F') {
                                    //console.log("Recent score changes were found for " + user.name);
                                    /*global sendRecentUpdate*/
                                    messageManagement.sendRecentUpdate(mybot, user, obj, bMap, calculatedAcc, db, function () {
                                        callback();
                                    });
                                }
                            });
                        }
                    }
                } catch (error) {
                    console.log("Error: " + error);
                }
            }
        });
    };

}());