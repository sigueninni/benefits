sap.ui.define([], function () {
    "use strict";
    return {
        REQUEST_TYPES: {
            EDUCATION_GRANT: "01",          // Education Grant
            RENTAL_SUBSIDY: "02"            // Rental Subsidy
        },
        
        REQUEST_STATUS: {
            DRAFT: "00",                    // Draft
            SUBMITTED: "01",                // Request submitted by the employee
            APPROVED_HRA: "02",             // Request approved by HRA
            REJECTED_HRA: "03",             // Request rejected by HRA
            RETURNED_TO_EMPLOYEE: "04",     // Request returned back to employee
            APPROVED_SENT_TO_H: "05",       // Request approved by HRA and sent to H
            APPROVED_HRO_END: "06",         // Request approved by HRO, end of process
            RETURNED_TO_HRA: "07",          // Request returned back to HRA
            SUBMITTED_CLAIMS: "09"          // Submitted (Claims)
        },
        
        USER_ROLES: {
            NO_ACTOR: "00",                 // No Actor
            EMPLOYEE: "01",                 // Employee - default role
            HRA: "02",                      // Human Resources Assistant
            HRO: "03"                       // Human Resources Officer
        }
    };
});
