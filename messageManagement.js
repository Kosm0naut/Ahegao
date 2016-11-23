/*jslint devel: true, node: true, plusplus: true, nomen: true, bitwise: true*/
"use strict";

(function () {
    var //Promise = require('promise'),
        //osu = require('osu-api'),
        //playerFormation = require('./playerFormation'),
        calculations = require('./calculations'),
        serverManagement = require('./serverManagement'),
        beatmapManagement = require('./beatmapManagement');

    module.exports.sendRecentUpdate = function (mybot, user, obj, bMap, calculatedAcc, db, callback) {
        var i = 0;
        for (i; i < user.trackedBy.length; i++) {
            serverManagement.findServer(user.trackedBy[i], db, function (item) {
                if (item[0].trackStarted) {
                    mybot.channels.get(item[0]._id).sendMessage('Displaying stats for **' + user.name +
                                ':** \nMap: **' + bMap.artist + " - " + bMap.title + " [" + bMap.diff + "] (https://osu.ppy.sh/b/" + obj[0].beatmap_id + ")" +
                                '** \nCombo: **' + obj[0].maxcombo + '/' + bMap.maxcombo +
                                '** Misses: **' + obj[0].countmiss +
                                '** \nGrade: **' + obj[0].rank +
                                "** Accuracy: **" + calculatedAcc + " %" +
                                "**\nMods: **"  + calculations.getMod(obj[0].enabled_mods) +
                                "**");
                }
            });
        }
        if (i === user.trackedBy.length) {
            callback();
        }
    };

    module.exports.printTopScoresUpdate = function (mybot, osu, db, userObj, score, index, callback) {
        var i = 0;
        beatmapManagement.getBeatmapData(score.beatmap_id, osu, function (obj) {
            for (i; i < userObj.serverId.length; i++) {
                serverManagement.findServer(userObj.serverId[i], db, function (item) {
                    if (item[0].botStarted) {
                        mybot.channels.get(item[0]._id).sendMessage("**" + userObj.name +
                            "**: \nNew Top Score **#" + (index + 1) +  "**: \nMap: **" + obj.artist + " - " + obj.title + " [" + obj.diff + "] " +
                            "\n(https://osu.ppy.sh/b/" + score.beatmap_id + ")**\nCombo: **" + score.maxcombo + "x** Misses: **" + score.countmiss +
                            "**\nGrade: **" + score.rank + "** Accuracy: **" + parseFloat(calculations.getAcc(score.count300, score.count100, score.count50, score.countmiss)).toFixed(2) +
                            " %** \nMods: **" + calculations.getMod(score.enabled_mods) + "** Weighted: **" + score.pp + "**");
                        callback();
                    }
                });
            }
        });
    };

    module.exports.printUpdateMessage = function (mybot, userObj, obj, accuracyChange, total, db, callback) {
        var i = 0;
        for (i; i < userObj.serverId.length; i++) {
            serverManagement.findServer(userObj.serverId[i], db, function (item) {
                if (item[0].botStarted && ((Math.round(calculations.checkForChanges(userObj.pp, obj.pp_raw) * 100) / 100) > 1)) {
                    console.log("PP Gained by" + userObj.name);
                    /*global getChar*/
                    mybot.channels.get(item[0]._id).sendMessage("**" + userObj.name +
                        '**:\n**' + calculations.getChar(userObj.pp, obj.pp_raw) + Math.abs(Math.round(calculations.checkForChanges(userObj.pp, obj.pp_raw) * 100) / 100) + '** pp **\n' +
                        calculations.getChar(obj.pp_rank, userObj.rank) + Math.abs(Math.round(calculations.checkForChanges(userObj.rank, obj.pp_rank) * 100) / 100) + '** Ranks \n**' +
                        calculations.getChar(parseFloat(userObj.accuracy), parseFloat(obj.accuracy)) + Math.abs(parseFloat(accuracyChange)).toFixed(2) + "%** Accuracy**\n" +
                        (total.ppGained).toFixed(2) + '** pp this session **\n' +
                        total.rank + '** ranks this session');
                }
            });
        }
        if (i === userObj.serverId.length) {
            callback();
        }
    };

}());
