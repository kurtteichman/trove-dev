'use strict';

var Study = require('./study.model');
var User = require('./../user/user.model');
var levenshtein = require('fast-levenshtein');
var icd9Mapper = require('./../diseaseICD9MapperRegex').map;

var diseaseMapperML = require('./../diseaseArrayMapper').map;

var fs = require('fs');


//var serialized_study_data_path = __dirname + "/study_data/";
var SERIALIZED_STUDY_DATA_PATH = __dirname + "/study_data/";
if (!fs.existsSync(SERIALIZED_STUDY_DATA_PATH)) {
    fs.mkdirSync(SERIALIZED_STUDY_DATA_PATH);
}

var modalityMapper = require('./../modalityMapper');

function getTodayDateFormatted() {
    var today = new Date();
    return (today.getMonth()+1) + '-' + today.getDate() + '-' + today.getFullYear();
}

function formatReports(studies) {
    var studiesFormatted = studies;
    for (var i = 0; i < studies.length; i++) {
        if (studiesFormatted[i].report) {
            studiesFormatted[i].report = JSON.stringify(studiesFormatted[i].report.replace(/(\|)|(\s+)/g, " ").trim()).replace(/^"?(.+?)"?$/g, '$1');
        }
        if (studiesFormatted[i].transcribed_report) {
            studiesFormatted[i].transcribed_report = JSON.stringify(studiesFormatted[i].transcribed_report.replace(/(\|)|(\s+)/g, " ").trim()).replace(/^"?(.+?)"?$/g, '$1');
        }
    }
    return studiesFormatted;
}

// Get all studies on a single date, by currentUser
exports.allStudiesOnDate = function(req, res) {
    var cache_string = req.params.user + '/ALL/' + req.params.date;
    var lifetime = (new Date(getTodayDateFormatted()).getTime() === new Date(req.params.date).getTime()) ? 21600 : 0; // keep forever in cache if date already past
    
    /*return memcached.get(cache_string, function (err, data) {
        if(err) { return handleError(res, err); }
        if (!data || 'setCache' in req) {
            */
            Study.find({ 
                assistant_radiologist: req.params.user,
                transcribed_time: { 
                    $gte: (new Date(req.params.date).getTime()),
                    $lt: (new Date(req.params.date).getTime()) + 86400000
                }
            }, 'modality exam_name transcribed_time transcribed_report report levenshtein_distance', {sort: {transcribed_time: 1}}, function (err, studies) {
                if(err) { return handleError(res, err); }
                if(!studies) { return res.send(404); }
                console.log('setting cache key: ' + cache_string);
                //memcached.set(cache_string, studies, lifetime, function (err) { });
                return res.json(formatReports(studies));
            });
        /*
        } else {
            console.log('getting cache key: ' + cache_string);
            return res.json(formatReports(data));
        }

    });
    */
};

// Get all studies between two dates, by currentUser
exports.allStudiesBetweenDates = function(req, res) {
    var cache_string = req.params.user + '/ALL/' + req.params.startDate + '/' + req.params.endDate;
    var lifetime = (new Date(getTodayDateFormatted()).getTime() >= new Date(req.params.startDate).getTime() && new Date(getTodayDateFormatted()).getTime() <= new Date(req.params.endDate).getTime()) ? 21600 : 0; // keep forever in cache if date already past
    /*
    return memcached.get(cache_string, function (err, data) {
        if(err) { return handleError(res, err); }
        if (!data || 'setCache' in req) {
    */
            Study.find({
                assistant_radiologist: req.params.user,
                transcribed_time: { 
                    $gte: (new Date(req.params.startDate).getTime()),
                    $lt: (new Date(req.params.endDate).getTime()) + 86400000
                }
            }, function (err, studies) {
                if(err) { return handleError(res, err); }
                if(!studies) { return res.send(404); }
                console.log('setting cache key: ' + cache_string);
                //memcached.set(cache_string, studies, lifetime, function (err) { });
                return res.json(formatReports(studies));
            });
        /*
        } else {
            console.log('getting cache key: ' + cache_string);
            return res.json(formatReports(data));
        }
    });
    */
};

// Get studies for specified modality on a single date, by currentUser
exports.modalityStudiesOnDate = function(req, res) {
    var cache_string = req.params.user + '/' + req.params.modality + '/' + req.params.date;
    var lifetime = (new Date(getTodayDateFormatted()).getTime() === new Date(req.params.date).getTime()) ? 21600 : 0; // keep forever in cache if date already past
    /*
    return memcached.get(cache_string, function (err, data) {
        if(err) { return handleError(res, err); }
        if (!data || 'setCache' in req) {
    */
            Study.find({ 
                assistant_radiologist: req.params.user,
                transcribed_time: { 
                    $gte: (new Date(req.params.date).getTime()),
                    $lt: (new Date(req.params.date).getTime()) + 86400000
                },
                modality: modalityMapper.map(req.params.modality)
            }, null, {sort: {transcribed_time: 1}}, function (err, studies) {
                if(err) { return handleError(res, err); }
                if(!studies) { return res.send(404); }
                console.log('setting cache key: ' + cache_string);
                //memcached.set(cache_string, studies, lifetime, function (err) { });
                return res.json(formatReports(studies));
            });
    /*
        } else {
            console.log('getting cache key: ' + cache_string);
            return res.json(formatReports(data));
        }
    });
    */
};

// Get studies for specified modality between two dates, by currentUser
exports.modalityStudiesBetweenDates = function(req, res) {
    var cache_string = req.params.user + '/' + req.params.modality + '/' + req.params.startDate + '/' + req.params.endDate;
    var lifetime = (new Date(getTodayDateFormatted()).getTime() >= new Date(req.params.startDate).getTime() && new Date(getTodayDateFormatted()).getTime() <= new Date(req.params.endDate).getTime()) ? 21600 : 0; // keep forever in cache if date already past
    /*
    return memcached.get(cache_string, function (err, data) {
        if(err) { return handleError(res, err); }
        if (!data || 'setCache' in req) {
    */
            Study.find({ 
                assistant_radiologist: req.params.user,
                transcribed_time: { 
                    $gte: (new Date(req.params.startDate).getTime()),
                    $lt: (new Date(req.params.endDate).getTime()) + 86400000
                },
                modality: modalityMapper.map(req.params.modality)
            }, function (err, studies) {
                if(err) { return handleError(res, err); }
                if(!studies) { return res.send(404); }
                console.log('setting cache key: ' + cache_string);
                //memcached.set(cache_string, studies, lifetime, function (err) { });
                return res.json(formatReports(studies));
            });
        /*
        } else {
            console.log('getting cache key: ' + cache_string);
            return res.json(formatReports(data));
        }
    });
    */
};

// Get count of all studies on a single date, by currentUser
exports.allStudiesOnDateCount = function(req, res) {
    var cache_string = req.params.user + '/ALL/' + req.params.date + '/count';
    var lifetime = (new Date(getTodayDateFormatted()).getTime() === new Date(req.params.date).getTime()) ? 21600 : 0; // keep forever in cache if date already past
    /*
    return memcached.get(cache_string, function (err, data) {
        if (err) { return handleError(res, err); }
        if (typeof data === "undefined" || 'setCache' in req) {
    */
            Study.count({ 
                assistant_radiologist: req.params.user,
                transcribed_time: { 
                    $gte: (new Date(req.params.date).getTime()),
                    $lt: (new Date(req.params.date).getTime()) + 86400000
                }
            }, function (err, count) {
                if (err) { return handleError(res, err); }
                if (typeof count === "undefined") { count = 0; }
                console.log('setting cache key: ' + cache_string);
                //memcached.set(cache_string, count, lifetime, function (err) { });
                return res.json(count);
            });
        /*
        } else {
            console.log('getting cache key: ' + cache_string);
            return res.json(data);
        }
    });
    */
};

// Get count of all studies between two dates, by currentUser
exports.allStudiesBetweenDatesCount = function(req, res) {
    var cache_string = req.params.user + '/ALL/' + req.params.startDate + '/' + req.params.endDate + '/count';
    var lifetime = (new Date(getTodayDateFormatted()).getTime() >= new Date(req.params.startDate).getTime() && new Date(getTodayDateFormatted()).getTime() <= new Date(req.params.endDate).getTime()) ? 21600 : 0; // keep forever in cache if date already past
    /*
    return memcached.get(cache_string, function (err, data) {
        if (typeof data === "undefined" || 'setCache' in req) {
    */
            Study.count({ 
                assistant_radiologist: req.params.user,
                transcribed_time: { 
                    $gte: (new Date(req.params.startDate).getTime()),
                    $lt: (new Date(req.params.endDate).getTime()) + 86400000
                }
            }, function (err, count) {
                if(err) { return handleError(res, err); }
                if (typeof count === "undefined") { count = 0; }
                console.log('setting cache key: ' + cache_string);
                //memcached.set(cache_string, count, lifetime, function (err) { });
                return res.json(count);
            });
    /*
        } else {
            console.log('getting cache key: ' + cache_string);
            return res.json(data);
        }
    });
    */
};

// Get count of studies for specified modality on a single date, by currentUser
exports.modalityStudiesOnDateCount = function(req, res) {
    var cache_string = req.params.user + '/' + req.params.modality + '/' + req.params.date + '/count';
    var lifetime = (new Date(getTodayDateFormatted()).getTime() === new Date(req.params.date).getTime()) ? 21600 : 0; // keep forever in cache if date already past
    /*
    return memcached.get(cache_string, function (err, data) {
        if (typeof data === "undefined" || 'setCache' in req) {
    */
            Study.count({ 
                assistant_radiologist: req.params.user,
                transcribed_time: { 
                    $gte: (new Date(req.params.date).getTime()),
                    $lt: (new Date(req.params.date).getTime()) + 86400000
                },
                modality: modalityMapper.map(req.params.modality)
            }, function (err, count) {
                if(err) { return handleError(res, err); }
                if (typeof count === "undefined") { count = 0; }
                //console.log('setting cache key: ' + cache_string);
                //memcached.set(cache_string, count, lifetime, function (err) { });
                return res.json(count);
            });
    /*
        } else {
            console.log('getting cache key: ' + cache_string);
            return res.json(data);
        }
    });
    */
};

// Get count of studies for specified modality between two dates, by currentUser
exports.modalityStudiesBetweenDatesCount = function(req, res) {
    var cache_string = req.params.user + '/' + req.params.modality + '/' + req.params.startDate + '/' + req.params.endDate + '/count';
    var lifetime = (new Date(getTodayDateFormatted()).getTime() >= new Date(req.params.startDate).getTime() && new Date(getTodayDateFormatted()).getTime() <= new Date(req.params.endDate).getTime()) ? 21600 : 0; // keep forever in cache if date already past
    /*
    return memcached.get(cache_string, function (err, data) {
        if (typeof data === "undefined" || 'setCache' in req) {
    */
            Study.count({ 
                assistant_radiologist: req.params.user,
                transcribed_time: { 
                    $gte: (new Date(req.params.startDate).getTime()),
                    $lt: (new Date(req.params.endDate).getTime()) + 86400000
                },
                modality: modalityMapper.map(req.params.modality)
            }, function (err, count) {
                if(err) { return handleError(res, err); }
                if (typeof count === "undefined") { count = 0; }
                console.log('setting cache key: ' + cache_string);
                //memcached.set(cache_string, count, lifetime, function (err) { });
                return res.json(count);
            });
    /*
        } else {
            console.log('getting cache key: ' + cache_string);
            return res.json(data);
        }
    });
    */
};

// Get studies with disease label
exports.diseaseStudies = function(req, res) {
    var cache_string = req.params.user + '/disease/' + encodeURIComponent(req.params.disease).replace('\'', '%27');
    var lifetime = 86400;
    /*
    return memcached.get(cache_string, function (err, data) {
        if(err) { return handleError(res, err); }
        if (!data || 'setCache' in req) {
    */
            var icd9code_array = icd9Mapper(req.params.disease);
            var disease_array = diseaseMapperML(req.params.disease);
            
            Study.find({ 
                assistant_radiologist: req.params.user,
                // icd9_codes: { 
                //     $in: icd9code_array
                // }
                disease_labels: {
                    $in: disease_array
                }
            }, 'modality exam_name transcribed_time transcribed_report report levenshtein_distance', {sort: {transcribed_time: 1}}, function (err, studies) {
                if(err) { return handleError(res, err); }
                if(!studies) { return res.send(404); }
                console.log('setting cache key: ' + cache_string);
                //memcached.set(cache_string, studies, lifetime, function (err) { });
                return res.json(formatReports(studies));
            });
    /*
        } else {
            console.log('getting cache key: ' + cache_string);
            return res.json(formatReports(data));
        }
    });
    */
};

// Get count of studies with disease label
exports.diseaseStudiesCount = function(req, res) {
    var cache_string = req.params.user + '/disease/' + encodeURIComponent(req.params.disease).replace('\'', '%27') + '/count';
    var lifetime = 86400;
    /*
    return memcached.get(cache_string, function (err, data) {
        if (err) { return handleError(res, err); }
        if (typeof data === "undefined" || 'setCache' in req) {
    */
            var icd9code_array = icd9Mapper(req.params.disease);
            var disease_array = diseaseMapperML(req.params.disease);

            console.log("diseaseMapperML");
            console.log(diseaseMapperML(req.params.disease));
           // icd9code_array = [ /565/, /"SBO"/ ];
           // console.log("updated icd9code_array");
          //  console.log(icd9code_array);
           // console.log(req.params.disease_labels_hv);
            Study.count({ 
                assistant_radiologist: req.params.user,
                disease_labels: { 
              //  icd9_codes: {
                 //   $in: [/SBO/]
                    $in: disease_array
              //      $in: icd9code_array
                }

               

            }, function (err, count) {
                if (err) { return handleError(res, err); }
                if (typeof count === "undefined") { count = 0; }
                //console.log('setting cache key: ' + cache_string);
                //memcached.set(cache_string, count, lifetime, function (err) { });
                //count = 0;
              //  console.log("count");
               // console.log(count);
                return res.json(count);


            });
                //console.log("Study.count: ");
                //console.log(Study.count);
                //console.log("assistant_radiologist:");
                //console.log(assistant_radiologist);
        /*
        } else {
            console.log('getting cache key: ' + cache_string);
            return res.json(data);
        }
    });
    */
};

// HV Get ML disease label

// exports.getMlDisease = function(req, res) {
//     var cache_string = req.params.user + '/disease/' + encodeURIComponent(req.params.disease).replace('\'', '%27') + '/countML';
//     var lifetime = 86400;

//             var icd9code_array = icd9Mapper(req.params.disease);


//             Study.count({ 
//                 assistant_radiologist: req.params.user,
//                 icd9_codes: { 
//                     $in: icd9code_array
//                 }             

//             }, function (err, count) {
//                 if (err) { return handleError(res, err); }
//                 if (typeof count === "undefined") { count = 0; }
//                 console.log('setting cache key: ' + cache_string);
//                 memcached.set(cache_string, count, lifetime, function (err) { });
//                 //count = 2;
//                 console.log("MLcount: ");
//                 console.log(count);
//                 return res.json(count);
//             });
// };


exports.processHL7JSON = function(req, res) {
    // just keeping functions in here to reduce clutter for now
    function getWordCount(report) {
        if (report) {
            var temp_report_array = report.split('|').slice(8);
            //var temp_report_array = temp_report_array.slice(0,temp_report_array.length-6);
            return temp_report_array.slice(0,temp_report_array.length-6).join(" ").split(/\s+/).length;
        } else {
            return 0;
        }
    }

    // Leon's Method scripts/calculate_distances.js
    function calcLevenshteinDist (report_1, report_2) {
        var distance = levenshtein.get(report_1, report_2);
        return distance;
    }

    // Leon's Method scripts/calculate_distances.js
    function processReport (transcribed_report, finalized_report) {
        var footerIndexTranscribed = transcribed_report.toLowerCase().lastIndexOf("prepared by: ");
        var footerIndexFinal = finalized_report.toLowerCase().lastIndexOf("prepared by: ");
        var transcribed_report_processed = transcribed_report.substring(0, footerIndexTranscribed) + finalized_report.substring(footerIndexFinal);
        return transcribed_report_processed;
    }

    // Leon's Method scripts/calculate_distances.js
    function formatReports(study) {
        var studyFormatted = study;
        var output_reports = {
            'f_finalized_report':'',
            'f_transcribed_report':''
        };

        if (studyFormatted.finalized_report) {
            output_reports['f_finalized_report'] = JSON.stringify(studyFormatted.finalized_report.replace(/(\|)|(\s+)/g, " ").trim()).replace(/^"?(.+?)"?$/g, '$1');
        }

        if (studyFormatted.transcribed_report) {
            output_reports['f_transcribed_report'] = JSON.stringify(studyFormatted.transcribed_report.replace(/(\|)|(\s+)/g, " ").trim()).replace(/^"?(.+?)"?$/g, '$1');
        }

        return output_reports;
    }

    function getRadiologist(name) {
        var raw_name = name.replace('MD','').trim();
        var raw_name_array = raw_name.split(',');
        return (raw_name_array[1] + ' ' + raw_name_array[0]).trim();
    }

    function convertHL7DateToJavascriptDate(date_string) {
        if (date_string) {
            var year = date_string.slice(0,4);
            var month = String(parseInt(date_string.slice(4,6)) - 1);
            var date = date_string.slice(6,8);
            var hour = date_string.slice(8,10);
            var minutes = date_string.slice(10,12);
            var seconds = date_string.slice(12,14);
            var temp_date = new Date(year,month,date,hour,minutes,seconds);
            //return getUTCDate(temp_date);
            // it would appear that these times are already stored in UTC format
            return temp_date;
        }
    }

    function parseAssistantRadiologistFromReport(report) {
        var regex = /.*Prepared\sBy:(.*?)\|/;
        var match = regex.exec(report);
        var radiologist = null;
        if (match) {
            radiologist = getRadiologist(match[1])
        }
        return radiologist || '';
    }

    function parseRadiologistFromReport(report) {
        var regex = /.*Study\sinterpreted\sand\sreport\sapproved\sby:(.*?)\|/;
        var match = regex.exec(report);
        var radiologist = null;
        if (match) {
            radiologist = getRadiologist(match[1])
        }
        return radiologist || '';
    }

    function populateStudy(study,request_body) {
        study['modality']            = request_body['modality'].trim();
        study['service_description'] = request_body['service_description'].trim();
        study['service_code']        = request_body['service_code'].trim();
        study['report']              = request_body['report'].trim();
        study['accession']           = request_body['accession'].replace(/-\d+/,"").trim();
        study['service_code']        = request_body['service_code'].trim();
        study['exam_name']           = request_body['service_description'].trim();
    }

    var temp_radiologist_string = getRadiologist(req.body['radiologist']) || "";
    var temp_assistant_radiologist_string = getRadiologist(req.body['assistant_radiologist']) || "";


    var result_status = req.body['result_status'];
    console.log("result_status");
    console.log(result_status);

    // var disease_label_from_db = req.body['disease_labels'];
    // console.log("disease_label_from_db");
    // console.log(disease_label_from_db);

    var current_study = null;

    Study.findOne({
        accession:req.body.accession.replace(/-\d+/,""),
    },function (err, study) {
        if(err) { return handleError(res, err); }

        if(study) { 
            current_study = study;
        } else {
            current_study = new Study();
        }

        // need to check if these match -- the report rad name and the name stored in the hl7_json
        if (temp_assistant_radiologist_string == undefined && req.body['report']) { 
            temp_assistant_radiologist_string = parseAssistantRadiologistFromReport(req.body['report']);
        }

        //console.log(req.body);

        // Adding this to retroactively populate studies for users who have not been yet added to the db
        current_study['retro_assistant_radiologist'] = temp_assistant_radiologist_string;
        current_study['retro_radiologist'] = temp_radiologist_string;
        current_study['word_count'] = getWordCount(req.body['report']);

        console.log(temp_assistant_radiologist_string);


        User.findOne({ 
            full_name : temp_assistant_radiologist_string 
        }, function(err, user) {
            // assuming all users exist already
            // if they do not currently exist in the db, they are assigned the id of 0
            if (user) {
                console.log('resident found');
                current_study['assistant_radiologist'] = user['userId'];
            } else {
                console.log('no resident found for accession' + req.body.accession.replace(/-\d+/,""));
                // current_study['assistant_radiologist'] = 0;
            }

            // This is an incorrect assumption for loading data from James-mirth
            // Things will populate and save in an asynchronous manner
            // populateStudy will technically overwrite old values with the current
            // populateStudy will assign values as specified from the req.body
            // current_study['hl7_json_history'].push(JSON.stringify(req.body));

            if (req.body['result_time']) {
                var current_result_date = convertHL7DateToJavascriptDate(req.body['result_time']);
                var current_result_time = current_result_date.getTime();

                if ((current_study['last_result_time'] || 0) < current_result_time) {
                    current_study['last_result_date'] = current_result_date;
                    current_study['last_result_time'] = current_result_time;
                    // overwrite old values since the message is newer than the last stored update
                    // this method will most likely never be called more than once each time this route is fired,
                    // although it is shown to be called to populate a newly created study
                    populateStudy(current_study, req.body);
                }
            }    

            if (req.body['report']) {
                current_study['hl7_json_history'].push(JSON.stringify(req.body));
            }

            if (req.body['scheduled_time']) {
                var scheduled_date = convertHL7DateToJavascriptDate(req.body['scheduled_time']);
                current_study['scheduled_date'] = scheduled_date;
                current_study['scheduled_time'] = scheduled_date.getTime();
            }

            if (req.body['completed_time']) {
                var completed_date = convertHL7DateToJavascriptDate(req.body['completed_time']);
                current_study['completed_date'] = completed_date;
                current_study['completed_time'] = completed_date.getTime();
            }

            // TODO: Workout better logic regarding how these get updated. As it is, a finalized json could come in before
            // a transcribed json
            if (req.body['completed_time']) {  //HV change this back to original 12/10/2015
            //if (result_status == 'P' && parseRadiologistFromReport(req.body['report']) == 'undefined' && req.body['result_time']) {
            //  if (result_status == 'P' && req.body['result_time']) {
                var transcribed_date = convertHL7DateToJavascriptDate(req.body['result_time']);
                current_study['transcribed_report'] = req.body['report'];
                console.log("report");
                console.log(req.body['report']);
                current_study['transcribed_date'] = transcribed_date;
                current_study['transcribed_time'] = transcribed_date.getTime();
                current_study['transcribed_word_count'] = current_study['word_count'];
            }

            //HV populate disease_labels in database
            if (req.body['disease_labels']){
                var disease_labels = req.body['disease_labels'];
                current_study['disease_labels'] = disease_labels;
            }

             if (req.body['icd9_codes']){
                 var icd9_codes = req.body['icd9_codes'];
                 current_study['icd9_codes'] = icd9_codes;
               // console.log("icd9_codes");
              //   console.log("icd9_codes_hv");
             }
          //  console.log("icd9_codes_hv");
          //  console.log(icd9_codes_hv);

            if (result_status == 'F' && req.body['result_time']) {
                var finalized_date = convertHL7DateToJavascriptDate(req.body['result_time']);
                current_study['finalized_report'] = req.body['report'];
                current_study['finalized_date'] = finalized_date;
                current_study['finalized_time'] = finalized_date.getTime();
                current_study['finalized_word_count'] = current_study['word_count'];

                // TODO Levenshtein distance, need to talk with leon
                var output_reports = formatReports(current_study);
                // f_ denotes 'formatted'
                var f_finalized_report = output_reports['f_finalized_report'];
                var processed_f_trascribed_report = processReport(output_reports['f_transcribed_report'], output_reports['f_finalized_report']);
                //console.log(f_finalized_report);
                //console.log(processed_f_trascribed_report);
                var dist = calcLevenshteinDist(output_reports['f_finalized_report'], processed_f_trascribed_report);
                if (dist > 0) {
                  //  console.log(dist);
                   // console.log(output_reports['f_finalized_report']);
                   // console.log(processed_f_trascribed_report);
                }
                //console.log(dist);
                //console.log(dist);
                current_study['levenshtein_distance'] = dist;
            }

            current_study.save();
            res.json(req.body);
        });
    });

    // just to send something back to numeria-mirth 
}

function handleError(res, err) {
    console.log(err);
    return res.send(500, err);
}