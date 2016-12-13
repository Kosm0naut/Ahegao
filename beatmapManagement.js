/*jslint devel: true, node: true, plusplus: true, nomen: true, bitwise: true*/
"use strict";

(function () {
    var calculations = require('./calculations.js'),
        Promise = require('promise');

    module.exports.getBeatmapData = function (beatmapId, osu, callback) {
        var bMap = {
            artist: undefined,
            title: undefined,
            diff: undefined,
            maxcombo: undefined,
            mapRank: undefined
        };
        osu.getBeatmap(beatmapId, function (err, obj) {
            calculations.totalRequestsIncrement();
            if (err) {
                console.log("Error retrieving beatmap object: " + err);
            } else if (obj) {
                try {
                    bMap.artist = obj.artist;
                    bMap.title = obj.title;
                    bMap.diff = obj.version;
                    bMap.maxcombo = obj.max_combo;
                    bMap.mapRank = obj.rank;
                    setTimeout(function () {
                        if (bMap !== undefined) {
                            return callback(bMap);
                        }
                    }, 500);
                } catch (exc) {
                    console.log("Error occured: " + exc);
                }
            }
        });
    };

    module.exports.getBeatmapset = function (beatmapId, osu) {
        return new Promise(function (fullfill, reject) {
        osu.getBeatmap(beatmapId, function (err, obj) {
            calculations.totalRequestsIncrement();
            if (err) {
                reject(err);
            } else if (obj) {
                fullfill(obj.beatmapset_id);
            }
        });
      });
    };


}());
