package Template

/*
    import section
    - no blank lines in between, no semi-colons
*/

import com.axeda.common.sdk.id.Identifier
import com.axeda.drm.sdk.Context
import com.axeda.drm.sdk.audit.AuditCategory
import com.axeda.drm.sdk.audit.AuditMessage
import com.axeda.drm.sdk.scripto.Request
import groovy.json.*

/*
    parameter section
    - all parameters should be declared here
    - no blank lines in between, no semi-colons
    - all variables should be camelCase
    reserved variables:
    - "info" : If set to "1", additional info will be displayed
    - "mock" : If set to "1", the pre-configured Mock response will be returned
    - "mockError" : If set to "1", the pre-configured Mock Error response will be returned
*/
// reserved parameters
def info = parameters.info
def mock = parameters.mock
def mockError = parameters.mockError

// per-script parameters
def param1
def param2

/**
 * initialize our global variables
 * json = the contents of our response
 * infoString = a stringBuilder used to collect debug information during the script
 * contentType = the content type we will return
 * scriptname = The name of this Script, used in multiple places
*/
def json = new groovy.json.JsonBuilder()
def infoString = new StringBuilder()
def contentType = "application/json"
def scriptName = "JSONTemplateService.groovy"
def root = [:]


/*
    the mock request
    - this is an example of a request that this script will accept
 */
def mockRequest =
"""{
	"request": {
		"criteria": {
			"pageSize":10,
			"pageNumber":1,
		},
		"params": {
			"param1": "param 1 value",
			"param2": "param 2 value"
		}
	}
}
"""


/*
    the mock response
    - this is an example of a response that this script will return
    - this shows the contract that this script will adhere to
    - when in testing mode (mock=1) this will be returned
 */
def mockResponse =
"""{
	"response": {
		"criteria": {
			"pageSize":10,
			"pageNumber":1,
			"totalCount":100
		},
		"body": {
			"param1": "param 1 value",
			"param2": "param 2 value"
		}
	}
}
"""

/**
 * the mock error response
 * - this is an example of a response that this script will return in the case of an error
 * - this shows the contract that this script will adhere to
 * - when in error testing mode (mockError=1) this will be returned
 */
def mockErrorResponse =
"""{
	"errors": {
		"error": {
			"errorCode":"1234",
			"message":"Error Message 1"
		},
		"error": {
			"errorCode":"4321",
			"message":"Error Message 2"
		}
	}
}
"""

try {
    /* if we are in mock mode, respond with the template JSON response */
    if (mock?.equals("1")) { return createReturnMap(contentType,mockResponse) }

    /* if we are in mock error mode, respond with the template JSON error response */
    if (mockError?.equals("1")) { return createReturnMap(contentType,mockErrorResponse) }

    /* BUSINESS LOGIC GOES HERE */

    /* When logging a message, use this method. The information will go to the log, and will be appended to the infoString */
    logMessage(logger,scriptName,infoString,"Log this message!")

    /* when leaving a debug trail, append to the info String */
    infoString.append("Logging some debug output\n")

    /* When auditing a message, a category must be provided (see the auditMessage javadoc).
       The assetID is optional, and if provided will associate the audit message that asset */
    auditMessage("network","Audit this Device please!!!","1")

    // put in an error if we have received it in the message
    if (Request.body?.contains("Error")) {
        throw new Exception("I am Exceptional!!!")
    } else {
        if (!Request.body?.equals("")) {
            // actually parse the body
            def request = new JsonSlurper().parseText(Request.body)
            param1 = request.request.params.param1
            param2 = request.request.params.param2
        } else {
            throw new Exception("Request Body CANNOT be null!!!")
        }
    }

    /* response is a json structure */
    root = json.response {
        criteria  {
            pageSize    10
            pageNumber  1
            totalCount  100
        }
        body {
            param "param 1 value: ${param1}"
            param "param 2 value: ${param2}"
        }
    }

} catch (Exception e) {
    def errorCode = "123456"
    processException(scriptName,json,e,errorCode)
}

/*
    Regardless of the success / failure, info will be appended if requested
 */

/* add info to the response if requested */
if (info?.equals("1")) {
    root?.putAll("info":infoString.toString())
}

/* return the response */
return createReturnMap(contentType,JsonOutput.prettyPrint(json.toString()))

/*
 *
 * ACTIVE CODE ENDS HERE
 *
 */

//---------------------------------------------------------------//

/*
 *
 * HELPER METHODS START BELOW
 *
 */

/**
 * Wrap-up the response in our standard return map
 * @param contentType The global contentType variable
 * @param response The contents of the response (String ONLY)
 */
private def createReturnMap(String contentType, String response) {
    return ["Content-Type": contentType,"Content":response]
}

/*
    Processes the contents of an Exception and add it to the Errors collection
    @param json The markup builder
 */
private def processException(String scriptName, JsonBuilder json, Exception e, String code) {
    // catch the exception output
    def logStringWriter = new StringWriter()
    e.printStackTrace(new PrintWriter(logStringWriter))
    logger.error("Exception occurred in ${scriptName}: ${logStringWriter.toString()}")

    /*
        Construct the error response
        - errorCode Will be an element from an agreed upon enum
        - errorMessage The text of the exception
     */
    json.errors  {
        error {
            errorCode   "${code}"
            message     "[${scriptName}]: " + e.getMessage()
            timestamp   "${System.currentTimeMillis()}"
        }
    }

    return json
}

/*
    Log a message. This will log a message and add it to info String
    @param logger The injected logger
    @param scriptName The name of the script being executed
    @param info The infoString to append to
    @param message The actual message to log
 */
private def logMessage(def logger, String scriptName, StringBuilder info, String message) {
    logger.info(message)
    info.append(message+"\n")
}

/*
    Audit a message. This will store a message in the Audit log, based on the supplied category.
    @param category The category for this audit message. One of: "scripting", "network", "device" or "data". Anything not recognized will be treated as "data".
    @param message The actual message to audit
    @param assetId If supplied, will associate the audit message with the asset at this ID
 */
private def auditMessage(String category, String message, String assetId) {
    AuditCategory auditCategory = null
    switch (category) {
        case "scripting":
            auditCategory = AuditCategory.SCRIPTING;
            break;
        case "network":
            auditCategory = AuditCategory.NETWORK;
            break;
        case "device":
            auditCategory = AuditCategory.DEVICE_COMMUNICATION;
            break;
        default:
            auditCategory = AuditCategory.DATA_MANAGEMENT;
            break;
    }

    if (assetId == null) {
        new AuditMessage(Context.create(),"com.axeda.drm.rules.functions.AuditLogAction",auditCategory,[message]).store()
    } else {
        new AuditMessage(Context.create(),"com.axeda.drm.rules.functions.AuditLogAction",auditCategory,[message],new Identifier(Long.valueOf(assetId))).store()
    }
}