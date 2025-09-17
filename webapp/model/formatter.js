sap.ui.define([
    "com/un/zhrbenefrequests/model/constants"
], function (constants) {
    "use strict";
    return {

        /* 
        Status codes with descriptions:
        00 - Draft
        01 - Request submitted by employee
        02 - Request approved by HRA
        03 - Request rejected by HRA
        04 - Request sent back to employee
        05 - Request approved by HRA and sent to HRO
        06 - Request approved by HRO, end of process
        07 - Request sent back to HRA 
        */

        requestStatusStateText: function (iStatus) {
            if (iStatus) {
                switch (iStatus) {
                    case constants.REQUEST_STATUS.DRAFT:
                        return "None";
                    case constants.REQUEST_STATUS.SUBMITTED:
                        return "None";
                    case constants.REQUEST_STATUS.APPROVED_HRA:
                        return "Success";
                    case constants.REQUEST_STATUS.REJECTED_HRA:
                        return "Error";
                    case constants.REQUEST_STATUS.RETURNED_TO_EMPLOYEE:
                        return "Warning";
                    case constants.REQUEST_STATUS.APPROVED_SENT_TO_H:
                        return "None";
                    case constants.REQUEST_STATUS.APPROVED_HRO_END:
                        return "Success";
                    case constants.REQUEST_STATUS.RETURNED_TO_HRA:
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

        /**
         * Formatter pour convertir la valeur du modèle en état du switch
         * true (state ON) correspond à 'N' dans le modèle
         * false (state OFF) correspond à '' (vide) dans le modèle
         * @param {string} sValue - La valeur du modèle ('N' ou '')
         * @returns {boolean} - L'état du switch
         */
        formatMultipleAttendanceState: function(sValue) {
            return sValue === 'N';
        }

    };



})