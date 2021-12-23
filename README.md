# Prerequisites

Make sure your Bring! account has a password. This is not the case if you have used google auth.
in the Bring!-App settings you can set a password subsequently.

# Install

Maintain ```BRING_USER_MAIL``` and ```BRING_USER_PASSWORD``` and run ```docker-compose up```

# How it works

Each 10 seconds the service scans the items in the first shopping list of the given account and checks, if the name of the item contains numbers and units. 
If so, it removes the quantity and unit from the name, converts the written representation of the quantity into a number, replaces the unit with its abbreviation and places it into the item's specification field. 

