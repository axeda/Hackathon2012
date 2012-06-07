// axeda.js
//
// functions and variables pertaining to axeda services
//
// author: philip lombardi
// created on: august 29, 2011

// using the enterprise jquery namespace methodology see below:
// http://enterprisejquery.com/2010/10/how-good-c-habits-can-encourage-bad-javascript-habits-part-1/

var axeda = (function (axeda, $, undefined) {
    axeda.username = ""
    PASSWORD = ""

    var PLATFORM_HOST = 'http://platform.axeda.com';
    var SERVICES_PATH = '/services/v1/rest/';

    var SESSION_ID = null;
    var SESSION_EXPIRATION = 6000 * 6000 * 10000000;

    var STOREINTERVAL = 5

    function setHost() {
        if (window.location.protocol === 'file:') {
            return '.';
        }
        if (window.location.hostname === '127.0.0.1') {
            return PLATFORM_HOST;
        }
        return PLATFORM_HOST;
    }

    ;

    axeda.host = setHost();

    axeda.doLogin = function (username, password, success, failure) {
        return login(username, password, success, failure);
    };

    function login(username, password, success, failure) {
        var reqUrl = axeda.host + SERVICES_PATH + 'Auth/login';
        localStorage.clear()
        return $.get(reqUrl, {'principal.username':username, 'password':password},
            function (xml) {
                var sessionId = $(xml).find("ns1\\:sessionId, sessionId").text()
                // var sessionId = $(xml).find("[nodeName='ns1:sessionId']").text(); - no longer works past jquery 1.7
                if (sessionId) {
                    // set the username and password vars for future logins.
                    axeda.username = username
                    PASSWORD = password

                    storeSession(sessionId);
                    success(SESSION_ID); // return the freshly stored contents of SESSION_ID
                } else {
                    failure($(xml).find("faultstring").text());
                }
            }).error(function () {
                alert('Err: axeda.login -- unable to complete action.')
            });
    }

    ;

    axeda.loginWithCookie = function () {
        var cookiePiece;
        var cookieArray = document.cookie.split(';');
        var i;
        var pos;

        for (i = 0; i < cookieArray.length; i++) {
            cookiePiece = cookieArray[i];
            if ((pos = cookiePiece.indexOf('sessionId=')) >= 0) {
                SESSION_ID = cookiePiece.substring(pos + 10, cookiePiece.length);
                return true;
            }
        }
        return false;
    };


    function expiredSessionLogin() {
        login(axeda.username, PASSWORD, function () {
        }, function () {
        })
    }

    ;

    function storeSession(sessionId) {
        var date = new Date();
        date.setTime(date.getTime() + SESSION_EXPIRATION);
        SESSION_ID = sessionId
        document.cookie = 'sessionId=' + SESSION_ID + '; expires=' + date.toGMTString() + '; path=/';
        return true;
    }

    ;

    axeda.doLogout = function () {
        logout();
    };

    function logout() {
        document.cookie = 'sessionId=; expires=' + new Date().toGMTString() + '; path=/';
        SESSION_ID = null;
        SESSION_EXPIRATION = null;
        localStorage.clear();
        axeda.username = ""
        PASSWORD = ""
    }

    ;

    axeda.callScripto2 = function (httpMethod, script, parameters, attempts, success, failure) {
        switch (httpMethod) {
            case "GET":
            default:
                return $.get(url, parameters,
                    function (responseData) {
                        success(reponseData);
                    }).error(function () {
                        if (attempts) {
                            expiredSessionLogin();
                            setTimeout(function () {
                                axeda.callScripto2(httpMethod, script, parameters, attempts--, success, failure);
                            });
                        }
                    });
                break;
        }
        ;
    };

    /**
     * makes a call to the enterprise platform services with the name of a script and passes
     * the script any parameters provided.
     *
     * default is GET if the method is unknown
     *
     * Notes: Added POST semantics - plombardi @ 2011-09-07
     *
     * original author: Zack Klink & Philip Lombardi
     * added on: 2011/7/23
     */
    axeda.callScripto = function (method, scriptName, scriptParams, attempts, callback, localstoreoff) {
        var reqUrl = axeda.host + SERVICES_PATH + 'Scripto/execute/' + scriptName + '?sessionid=' + SESSION_ID

        var local
        var daystring = keygen()
        if (localstoreoff == null) {
            if (localStorage) {
                local = localStorage.getItem(scriptName + JSON.stringify(scriptParams))
            }
            if (local != null && local == daystring) {
                return dfdgen(reqUrl + JSON.stringify(scriptParams))
            }
            else {
                localStorage.setItem(scriptName + JSON.stringify(scriptParams), daystring)
            }
        }
        switch (method) {
            case "POST":
                return $.post(reqUrl, scriptParams,
                    function (data) {
                        if (!localstoreoff && localStorage) {
                            localStorage.setItem(reqUrl + JSON.stringify(scriptParams), JSON.stringify([data]))
                        }
                        callback(unwrapResponse(data))
                    }).error(function () {

                        if (attempts) {
                            expiredSessionLogin();
                            setTimeout(function () {
                                axeda.callScripto('POST', scriptName, scriptParams, attempts - 1, callback)
                            }, 1500);
                        }
                    })

                break;
            case "GET":
            default:
                return $.get(reqUrl, scriptParams,
                    function (data) {

                        if (!localstoreoff && localStorage) {
                            localStorage.setItem(reqUrl + JSON.stringify(scriptParams), JSON.stringify([data]))
                        }
                        callback(unwrapResponse(data))
                    }).error(function () {

                        if (attempts) {

                            expiredSessionLogin();
                            setTimeout(function () {
                                axeda.callScripto('GET', scriptName, scriptParams, attempts - 1, callback)
                            }, 1500);
                        }
                    })

                break;
        }
    };

    //create a deferred object to work with .then
    function dfdgen(reqUrlparam) {
        var dfd = $.Deferred
        dfd.resolve
        return localStorage.getItem(reqUrlparam)
    }

    // generate a key from the timestamp for local storage of json
    function keygen() {
        var d = new Date();
        var minute = d.getMinutes()
        var remainder = minute % STOREINTERVAL
        minute = minute - remainder
        if (minute.length < 2) minute = '0' + minute
        var hour = d.getHours()
        if (hour.length < 2) hour = '0' + hour
        var monthn = d.getMonth() + 1
        var month = monthn.toString()
        if (month.length < 2) month = '0' + month
        var day = d.getDate().toString()
        if (day.length < 2) day = '0' + day
        var year = d.getFullYear().toString()

        var dayString = year + month + day + hour + minute
        return dayString
    }

    // utility method to unwrap a response which might have been returned as a string rather
    // than JSON.
    function unwrapResponse(json) {
        if (typeof json === 'string') {
            json = $.parseJSON(json);
        }
        if (json.wsScriptoExecuteResponse) {
            json = $.parseJSON(json.wsScriptoExecuteResponse.content)
        }

        return json;
    }

    ;

    // method converts data into a format that is available to jqplot
    axeda.jqplotify = function (data, type) {
        var result = {seriesTicks:[], seriesData:[]}

        $.each(data, function (index, value) {
            value = $.map(value, function (x) {
                return x
            })

            // meh, it works. not a fan though.
            if (type == "line") {
                result.seriesTicks.push({label:value[0]})
                result.seriesData.push(value.slice(1))
            }

            if (type == "bar") {
                result.seriesTicks.push(value[0])
                result.seriesData.push(value[1])
            }

        })
        return result
    }

    return axeda;
}(window.axeda || {}, jQuery));