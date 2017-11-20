/*jslint devel: true, node: true, plusplus: true, nomen: true, bitwise: true*/
"use strict";

(function () {
    var //Promise = require('promise'),
        //osu = require('osu-api'),
        //playerFormation = require('./playerFormation'),
        calculations = require('./calculations'),
        serverManagement = require('./serverManagement'),
        beatmapManagement = require('./beatmapManagement'),
        messageManagement = require('./messageManagement'),
        dotenv = require('dotenv').config();

    module.exports.sendRecentUpdate = function (mybot, user, obj, bMap, calculatedAcc, db, osu, callback) {
        beatmapManagement.getBeatmapset(obj[0].beatmap_id, osu)
            .then(function (beatmapsetId) {
                user.trackedBy.forEach(function (trackedBy, i) {
                    serverManagement.findServer(trackedBy, db, function (item) {
                        if (item[0].trackStarted) {
                            mybot.channels.get(item[0]._id).send(" ", {embed: {
                                color: 3447003,
                                author: {
                                    name: user.name,
                                    url: 'https://osu.ppy.sh/u/' + user._id,
                                    icon_url: 'http://s.ppy.sh/a/' + user._id
                                },
                                thumbnail: {
                                    url: 'https://b.ppy.sh/thumb/' + beatmapsetId + 'l.jpg'
                                },
                                fields: [
                                    {
                                        name: '**Map**',
                                        value: '[' + bMap.artist + " - " + bMap.title + " [" + bMap.diff + "]](https://osu.ppy.sh/b/" + obj[0].beatmap_id + ')',
                                        inline: false
                                    },
                                    {
                                        name: '**Combo **',
                                        value: obj[0].maxcombo + '/' + bMap.maxcombo,
                                        inline: true
                                    },
                                    {
                                        name: "**Mods **",
                                        value: calculations.getMod(obj[0].enabled_mods).toString(),
                                        inline: true
                                    },
                                    {
                                        name: "**Accuracy **",
                                        value: calculatedAcc + " % (**" + obj[0].rank + "**)",
                                        inline: true
                                    },
                                    {
                                        name: "**Misses **",
                                        value: obj[0].countmiss,
                                        inline: true
                                    }
                                ]
                            }});
                        }
                    });
                    if (i === user.trackedBy.length - 1 || user.trackedBy.length === 0) {
                        callback();
                    }
                });
            });
    };

    module.exports.printTopScoresUpdate = function (mybot, osu, db, userObj, score, index, callback) {
        beatmapManagement.getBeatmapset(score[0].beatmap_id, osu)
            .then(function (beatmapsetId) {
                beatmapManagement.getBeatmapData(score[0].beatmap_id, osu, function (obj) {
                    userObj.serverId.forEach(function (serverId, i) {
                        serverManagement.findServer(serverId, db, function (item) {
                            if (item[0].botStarted) {
                                mybot.channels.get(item[0]._id).send(" ", {embed: {
                                    color: 3447003,
                                    author: {
                                        name: userObj.name,
                                        url: 'https://osu.ppy.sh/u/' + userObj._id,
                                        icon_url: 'http://s.ppy.sh/a/' + userObj._id
                                    },
                                    thumbnail: {
                                        url: 'https://b.ppy.sh/thumb/' + beatmapsetId + 'l.jpg'
                                    },
                                    fields: [
                                        {
                                            name: 'New top score **#' + (index + 1) + '**:',
                                            value: '[' + obj.artist + " - " + obj.title + " [" + obj.diff + "]](https://osu.ppy.sh/b/" + score[0].beatmap_id + ')',
                                            inline: false
                                        },
                                        {
                                            name: '**Combo **',
                                            value: score[0].maxcombo + 'x ' + score[0].countmiss + ' misses',
                                            inline: true
                                        },
                                        {
                                            name: "**Mods **",
                                            value: calculations.getMod(score[0].enabled_mods).toString(),
                                            inline: true
                                        },
                                        {
                                            name: "**Accuracy **",
                                            value: parseFloat(calculations.getAcc(score[0].count300, score[0].count100, score[0].count50, score[0].countmiss)).toFixed(2) + " % (**" + score[0].rank + "**)",
                                            inline: true
                                        },
                                        {
                                            name: "**Weighted **",
                                            value: score[0].pp,
                                            inline: true
                                        }
                                    ]
                                }});
                            }
                        });
                        if (i === userObj.serverId.length - 1 || userObj.serverId.length === 0) {
                            callback();
                        }
                    });
                });
            });
    };

    module.exports.printGainsMessage = function (arr, channel) {
        channel.send(" ", {embed: {
            color: 3447003,
            author: {
                name: 'PP totals for ' + channel.name,
                icon_url: channel.guild.iconURL
            },
            thumbnail: {
                url: 'http://i.imgur.com/COGvggB.png'
            },
            description: channel.topic,
            fields: arr
        }});
    };

    module.exports.printUpdateMessage = function (mybot, userObj, obj, accuracyChange, total, db, callback) {
        userObj.serverId.forEach(function (server, i) {
            serverManagement.findServer(server, db, function (item) {
                if (item[0].botStarted && ((Math.round(calculations.checkForChanges(userObj.pp, obj.pp_raw) * 100) / 100) > 1)) {
                    mybot.channels.get(item[0]._id).send("**" + userObj.name +
                        '**:\n**' + calculations.getChar(userObj.pp, obj.pp_raw) + Math.abs(Math.round(calculations.checkForChanges(userObj.pp, obj.pp_raw) * 100) / 100) + '** pp **\n' +
                        calculations.getChar(obj.pp_rank, userObj.rank) + Math.abs(Math.round(calculations.checkForChanges(userObj.rank, obj.pp_rank) * 100) / 100) + '** Ranks \n**' +
                        calculations.getChar(parseFloat(userObj.accuracy), parseFloat(obj.accuracy)) + Math.abs(parseFloat(accuracyChange)).toFixed(2) + "%** Accuracy**\n" +
                        (total.ppGained).toFixed(2) + '** pp this session **\n' +
                        total.rank + '** ranks this session');

                }
            });
            if (i === userObj.serverId.length - 1 || userObj.serverId.length === 0) {
                callback();
            }
        });
    };

}());
