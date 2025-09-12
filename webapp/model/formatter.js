sap.ui.define([], function () {
    "use strict";
    return {

        /* 
        00 F        Draft
        01 F        Request submitted by employee
        02 F        Request approved by HRA
        03 F        Request rejected by HRA
        04 F        Request sent back to employee
        05 F        Request approved by HRA and sent to HRO
        06 F        Request approved by HRO, end of process
        07 F        Request sent back to HRA 
        */


        requestStatusStateText: function (iStatus) {
            if (iStatus) {
                switch (iStatus) {
                    case '00':
                        return "None";
                    case '01':
                        return "None";
                    case '02':
                        return "Success";
                    case '03':
                        return "Error";
                    case '04':
                        return "Warning";
                    case '05':
                        return "None";
                    case '06':
                        return "Success";

                    case '07':
                        return "Warning";
                    default:
                        return "None";
                }
            } else {
                return "None";
            }
        },

        formatTime: function (oTime) {
            if (oTime) {
                const oDate = new Date(oTime.ms);
                const sTimeinMilliseconds = oDate.getTime();
                let oTimeFormat = sap.ui.core.format.DateFormat.getTimeInstance({
                    pattern: "HH:mm"
                });
                let TZOffsetMs = new Date(0).getTimezoneOffset() * 60 * 1000;
                let sTime = oTimeFormat.format(new Date(sTimeinMilliseconds + TZOffsetMs));
                return sTime;
            }
            return null;
        },

    };



})