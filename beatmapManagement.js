/*jslint devel: true, node: true, plusplus: true, nomen: true, bitwise: true*/
"use strict";

(function () {
    module.exports.getBeatmapData = function (beatmapId, osu, callback) {
        var bMap = {
            artist: undefined,
            title: undefined,
            diff: undefined,
            maxcombo: undefined,
            mapRank: undefined
        };
        osu.getBeatmap(beatmapId, function (err, obj) {
            //avgRequests.requestsTotal++;
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


}());
