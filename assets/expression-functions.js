(function () {
    const groups = {
        Conversion: ['Asc', 'AscW', 'CBool', 'CByte', 'CCur', 'CDate', 'CDbl', 'Chr', 'Chr$', 'ChrW', 'ChrW$', 'CInt', 'CLng', 'CLngPtr', 'CSng', 'CStr', 'CVar', 'CVDate', 'DateSerial', 'DateValue', 'Day', 'FormatCurrency', 'FormatDateTime', 'FormatNumber', 'FormatPercent', 'GUIDFromString', 'Hex', 'Hex$', 'Hour', 'HtmlEncode', 'Minute', 'Month', 'Oct', 'Oct$', 'PlainText', 'Second', 'Str', 'Str$', 'StrConv', 'StringFromGUID', 'TimeSerial', 'TimeValue', 'Val', 'Weekday', 'Year'],
        'Date/Time': ['CDate', 'CVDate', 'Date', 'Date$', 'DateAdd', 'DateDiff', 'DatePart', 'DateSerial', 'DateValue', 'Day', 'Hour', 'IsDate', 'Minute', 'Month', 'MonthName', 'Now', 'Second', 'Time', 'Time$', 'Timer', 'TimeSerial', 'TimeValue', 'Weekday', 'WeekdayName', 'Year'],
        Financial: ['DDB', 'FV', 'IPmt', 'NPer', 'Pmt', 'PPmt', 'PV', 'Rate', 'SLN', 'SYD'],
        General: ['QBColor', 'RGB'],
        Inspection: ['IsDate', 'IsNull'],
        Math: ['Abs', 'Atn', 'Cos', 'Exp', 'Fix', 'Int', 'Log', 'Rnd', 'Round', 'Sgn', 'Sin', 'Sqr', 'Tan'],
        Text: ['Asc', 'AscW', 'Chr', 'Chr$', 'ChrW', 'ChrW$', 'Format', 'Format$', 'GUIDFromString', 'HtmlEncode', 'InStr', 'InStrRev', 'LCase', 'LCase$', 'Left', 'Left$', 'Len', 'LTrim', 'LTrim$', 'Mid', 'Mid$', 'PlainText', 'Replace', 'Right', 'Right$', 'RTrim', 'RTrim$', 'Space', 'Space$', 'StrComp', 'StrConv', 'String', 'String$', 'StringFromGUID', 'StrReverse', 'Trim', 'Trim$', 'UCase', 'UCase$']
    };

    const definitions = {
        Abs: ['number'],
        Asc: ['string'],
        AscW: ['string'],
        Atn: ['number'],
        CBool: ['expression'],
        CByte: ['expression'],
        CCur: ['expression'],
        CDate: ['expression'],
        CDbl: ['expression'],
        Chr: ['charcode'],
        'Chr$': ['charcode'],
        ChrW: ['charcode'],
        'ChrW$': ['charcode'],
        CInt: ['expression'],
        CLng: ['expression'],
        CLngPtr: ['expression'],
        CSng: ['expression'],
        CStr: ['expression'],
        CVar: ['expression'],
        CVDate: ['expression'],
        Cos: ['number'],
        Date: [],
        'Date$': [],
        DateAdd: ['interval', 'number', 'date'],
        DateDiff: ['interval', 'date1', 'date2'],
        DatePart: ['interval', 'date'],
        DateSerial: ['year', 'month', 'day'],
        DateValue: ['date'],
        Day: ['date'],
        DDB: ['cost', 'salvage', 'life', 'period', '[factor]'],
        Exp: ['number'],
        Fix: ['number'],
        Format: ['expression', '[format]'],
        'Format$': ['expression', '[format]'],
        FormatCurrency: ['expression', '[digitsAfterDecimal]'],
        FormatDateTime: ['expression', '[namedFormat]'],
        FormatNumber: ['expression', '[digitsAfterDecimal]'],
        FormatPercent: ['expression', '[digitsAfterDecimal]'],
        FV: ['rate', 'nper', 'pmt', '[pv]', '[type]'],
        GUIDFromString: ['string'],
        Hex: ['number'],
        'Hex$': ['number'],
        Hour: ['time'],
        HtmlEncode: ['string'],
        InStr: ['[start]', 'string1', 'string2', '[compare]'],
        InStrRev: ['string1', 'string2', '[start]', '[compare]'],
        Int: ['number'],
        IPmt: ['rate', 'per', 'nper', 'pv', '[fv]', '[type]'],
        IsDate: ['expression'],
        IsNull: ['expression'],
        LCase: ['string'],
        'LCase$': ['string'],
        Left: ['string', 'length'],
        'Left$': ['string', 'length'],
        Len: ['string'],
        Log: ['number'],
        LTrim: ['string'],
        'LTrim$': ['string'],
        Mid: ['string', 'start', '[length]'],
        'Mid$': ['string', 'start', '[length]'],
        Minute: ['time'],
        Month: ['date'],
        MonthName: ['month', '[abbreviate]'],
        Now: [],
        NPer: ['rate', 'pmt', 'pv', '[fv]', '[type]'],
        Oct: ['number'],
        'Oct$': ['number'],
        PlainText: ['richText'],
        Pmt: ['rate', 'nper', 'pv', '[fv]', '[type]'],
        PPmt: ['rate', 'per', 'nper', 'pv', '[fv]', '[type]'],
        PV: ['rate', 'nper', 'pmt', '[fv]', '[type]'],
        QBColor: ['color'],
        Rate: ['nper', 'pmt', 'pv', '[fv]', '[type]', '[guess]'],
        Replace: ['expression', 'find', 'replace', '[start]', '[count]', '[compare]'],
        RGB: ['red', 'green', 'blue'],
        Right: ['string', 'length'],
        'Right$': ['string', 'length'],
        Rnd: ['[number]'],
        Round: ['number', '[numdecimalplaces]'],
        RTrim: ['string'],
        'RTrim$': ['string'],
        Second: ['time'],
        Sgn: ['number'],
        Sin: ['number'],
        SLN: ['cost', 'salvage', 'life'],
        Space: ['number'],
        'Space$': ['number'],
        Sqr: ['number'],
        Str: ['number'],
        'Str$': ['number'],
        StrComp: ['string1', 'string2', '[compare]'],
        StrConv: ['string', 'conversion', '[LCID]'],
        String: ['number', 'character'],
        'String$': ['number', 'character'],
        StringFromGUID: ['guid'],
        StrReverse: ['string'],
        SYD: ['cost', 'salvage', 'life', 'period'],
        Tan: ['number'],
        Time: [],
        'Time$': [],
        Timer: [],
        TimeSerial: ['hour', 'minute', 'second'],
        TimeValue: ['time'],
        Trim: ['string'],
        'Trim$': ['string'],
        UCase: ['string'],
        'UCase$': ['string'],
        Val: ['string'],
        Weekday: ['date', '[firstdayofweek]'],
        WeekdayName: ['weekday', '[abbreviate]', '[firstdayofweek]'],
        Year: ['date']
    };

    const descriptions = {
        Asc: 'Returns an Integer representing the character code corresponding to the first letter in a string.',
        CDate: 'Coerces an expression to a Date.',
        DDB: 'Returns a Double specifying the depreciation of an asset for a specific time period.',
        IsDate: 'Returns True when the expression can be converted to a valid date.',
        IsNull: 'Returns True when the expression contains no valid data.',
        Left: 'Returns characters from the left side of a string.',
        Mid: 'Returns characters from the middle of a string.',
        Replace: 'Replaces occurrences of a substring inside a string.',
        Round: 'Rounds a number to a specified number of decimal places.'
    };

    const names = Object.keys(definitions);
    const lookup = new Map(names.map(name => [name.toLowerCase(), name]));

    function canonicalName(name) {
        return lookup.get(String(name || '').toLowerCase()) || '';
    }

    function signature(name) {
        const canonical = canonicalName(name);
        return canonical ? `${canonical}(${definitions[canonical].join(', ')})` : String(name || '');
    }

    function insertText(name) {
        return signature(name);
    }

    function describe(name) {
        const canonical = canonicalName(name);
        if (!canonical) {
            return '';
        }
        return descriptions[canonical] || `Use ${signature(canonical)} in the expression.`;
    }

    window.AccessExpressionFunctions = {
        groups,
        names,
        canonicalName,
        signature,
        insertText,
        describe
    };
}());
