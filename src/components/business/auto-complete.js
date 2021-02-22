import React from 'react';
import { Field } from "redux-form";

import AutoComplete from "./redux-form-material-ui/AutoComplete";

const modifiedFuzzyFilter = function (searchText, key) {
    var compareString = key ? key.toLowerCase() : "";
    searchText = searchText && searchText.length ? searchText.toLowerCase() : "";
  
    var searchTextIndex = 0;
    if (searchText && compareString) {
      for (var index = 0; index < key.length; index++) {
        if (compareString[index] === searchText[searchTextIndex]) {
          searchTextIndex += 1;
        }
      }
    }
    
    return searchTextIndex === searchText.length;
};

const AutoCompleteField = props => (
    <Field 
        filter={modifiedFuzzyFilter}
        component={AutoComplete}
        dataSourceConfig={{text: 'text', value: 'value'}}
        parse={value => value.indexOf("@") > -1 ? value.replace(/^[^(]*\(/, "").replace(/\)[^(]*$/, "") : value}
        {...props}
    />
);

export default AutoCompleteField;