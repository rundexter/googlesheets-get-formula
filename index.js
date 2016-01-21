var _ = require('lodash'),
    Spreadsheet = require('edit-google-spreadsheet');

module.exports = {
    checkAuthOptions: function (step, dexter) {
        if(!step.input('range').first())
            return 'A [range] inputs variable is required for this module';

        if(!dexter.environment('google_spreadsheet'))
            return 'A [google_spreadsheet] environment variable is required for this module';

        return false;
    },

    convertColumnLetter: function(val) {
        var base = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
            result = 0;

        var i, j;

        for (i = 0, j = val.length - 1; i < val.length; i += 1, j -= 1) {

            result += Math.pow(base.length, j) * (base.indexOf(val[i]) + 1);
        }

        return result;
    },

    parseRange: function (range) {
        var rgx = new RegExp('^([A-Z]+)(\\d+)');

        if (!rgx.test(range)) {

            return false;
        } else {

            return {
                column: this.convertColumnLetter(range.match(/[A-Z]+/g)[0]),
                row: range.match(/\d+/g)[0]
            };
        }
    },

    /**
     * The main entry point for the Dexter module
     *
     * @param {AppStep} step Accessor for the configuration for the step using this module.  Use step.input('{key}') to retrieve input data.
     * @param {AppData} dexter Container for all data used in this workflow.
     */
    run: function(step, dexter) {
        var credentials = dexter.provider('google').credentials(),
            error = this.checkAuthOptions(step, dexter);
        var spreadsheetId = dexter.environment('google_spreadsheet'),
            worksheetId = step.input('worksheet', 1).first(),
            range = step.input('range', 'A1').first(),
            parseRange = this.parseRange(range);

        if (error) return this.fail(error);

        if (parseRange)
            Spreadsheet.load({
                //debug: true,
                spreadsheetId: spreadsheetId,
                worksheetId: worksheetId,
                accessToken: {
                    type: 'Bearer',
                    token: _.get(credentials, 'access_token')
                }
            }, function (err, spreadsheet) {

                if (err)
                    this.fail(err);
                else
                    spreadsheet.receive({getValues: false}, function (error, rows) {
                        if (error) {
                            this.fail(error);
                        } else {
                            var formula = _.get(rows, [parseRange.row, parseRange.column]);
                            formula = _.isString(formula) && formula.indexOf('=') === 0? formula : null;

                            this.complete({formula: formula});
                        }
                    }.bind(this));
            }.bind(this));
        else
            this.fail('Range must be as "A2"');
    }
};
