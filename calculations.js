/*jslint devel: true, node: true, plusplus: true, nomen: true, bitwise: true*/
"use strict";

(function () {
    var totalRequests = 0,
        calculations = require('./calculations.js');

    module.exports.getAcc = function (three, one, five, miss) {
        var sum = 0, denom = (parseFloat(five) + parseFloat(one) + parseFloat(three) + parseFloat(miss)) * 300;
        sum += parseFloat(five) * 50;
        sum += parseFloat(one) * 100;
        sum += parseFloat(three) * 300;
        return (sum / denom) * 100;
    };

    module.exports.getChar = function (number1, number2) {
        var char;
        if (number1 - number2 < 0) {
            char = '+';
        } else if (number1 - number2 > 0) {
            char = '-';
        } else if (number1 - number2 === 0) {
            char = '+';
        }
        if (char !== undefined) {
            return char;
        }
    };

    module.exports.getAccuracyChange = function (oldAcc, newAcc) {
        var accChange = parseFloat(oldAcc) - parseFloat(newAcc);
        if (!isNaN(accChange)) {
            return accChange;
        }
        return 0;
    };

    module.exports.isNumber = function (number) {
        if (!isNaN(number)) {
            return number;
        }
        return 0;
    };

    module.exports.getMod = function (modNo) {
        var mods = {
                HD: 8,
                HR: 16,
                SD: 32,
                PF: 16384,
                DT: 64,
                NC: 512,
                FL: 1024,
                EZ: 2,
                NF: 1,
                HT: 256,
                SO: 4096,
            },
            usedMods = [],
            property;
        for (property in mods) {
            if (mods.hasOwnProperty(property)) {
                if ((modNo & mods[property]) !== 0) {
                    usedMods.push(property);
                }
            }
        }
        if (usedMods.length > 0) {
            return usedMods; //this array is not empty
        }
        return "None"; //this array is empty
    };

    module.exports.stopInterval = function (interval) {
        clearInterval(interval);
    };

    module.exports.checkForChanges = function (old, latest) {
        if (old !== latest) {
            return latest - old;
        }
        return 0;
    };

    module.exports.thousandOperator = function (textString) {
        var number = parseInt(textString);
        return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    };

    module.exports.getHitCount = function (hc300, hc100, hc50) {
        var hc = parseInt(hc300) + parseInt(hc100) + parseInt(hc50);
        return hc.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    };

    module.exports.getPageInGlobal = function (obj) {
        var page = Math.ceil(parseInt(obj.pp_rank) / 50),
            text;
        if (page <= 200) {
            text = '[#' + obj.pp_rank + '](https://osu.ppy.sh/p/pp/?m=0&s=3&o=1&f=&page=' + page + ')';
        } else {
            text = '#' + obj.pp_rank;
        }
        return text;
    }

    module.exports.toHHMMSS = function (timeRunning) {
        var sec_num = parseInt(timeRunning, 10), hours   = Math.floor(sec_num / 3600), minutes = Math.floor((sec_num - (hours * 3600)) / 60), seconds = sec_num - (hours * 3600) - (minutes * 60);

        if (hours   < 10) { hours   = "0" + hours; }
        if (minutes < 10) { minutes = "0" + minutes; }
        if (seconds < 10) { seconds = "0" + seconds; }
        return hours + ':' + minutes + ':' + seconds;
    };

    module.exports.totalRequestsIncrement = function () {
        totalRequests++;
    };

    module.exports.getTotalRequests = function () {
        return totalRequests;
    };

}());
