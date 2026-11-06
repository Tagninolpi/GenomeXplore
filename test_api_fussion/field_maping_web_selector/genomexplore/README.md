# front end : 

## setup_filed_mapping:
### query input :
int input (tax id)

### refseq button:
toogle button if selected limits the search to results from refseq database
if not selected the search will return any assembly that is marked as referrence (from gene bank)

### search button:
sends query input and refseq button state to back end (req1*)

### export name input : 
str input name identifier of the fiald mapping the user want to save

### export button :
in the tree schema the user can select and unselect branches and leafs.
when you click export it will send the export name and the dict (it got from the back end)
if a leaf or branch is unselected it will be removed form the dict
and that dict will be send to the back end
refresh list when saved
(field maping1*)

### list field mapping :
show all the existing field mapping names : clicking them will load the dict into the tree schema 

### remove button :
when a field mapping is selected this button is not greyed out, (greyed if on main query result) 
when it is clicked the current field mapping is removed from local file
and the tree schema goes back to the main result (nothing if no request yet) 

### tree schema : 
takes a dict from backend (after search button) (search_result1*)
see claude chat ctagnin for how it is (change so that no buttom text for ratio but make it on hover)
this is basically an interactive display of the dict result

## base query :

### query button : 
same as setup_field_mapping

### refseq toogle button :
same as setup_field_mapping

### field mapping selector : 
same as list field mapping,
clicking them just selects them (you see which one is selected)

### search button :
send the query input, refseq, field mapping , get the result from the backend

### remove outliers :
remove all the outliers from the data (a new dict will be send)

### filter data :
apply filtering (a new column with the rang and or value will be created)

### export raw data :
for all the assecions ids run the get raw data script and make a downloadable file for the user (json format)

### import data : 
integrate new key value pairs to each item

### table results :
the results from the query is a dict with assecion id and then the 1D dict of all the fields.
the table should show the assecion id as column 1 and the other keys as the columns and each item in the list is a row. 

## java scripts :
one or more scripts for all the functionalities (seperated for easy modification)

## htmls :
probably multiple files for each page


# backend :

api comm with the front end

get data and send data 
call functions and scripts

