# azure-cosmos-db-ts-web

Express-based web application, implemented in TypeScript, using the azu-js
NPM package.  Featuring Azure Cosmos DB, et al.

## Purpose

This web application is intended for these several purposes:

- To demonstrate the use of these **Azure PaaS Services**:
  - **Azure Cosmos DB NoSQL API**
  - **Azure OpenAI**
  - Azure Cognitive Search
- To provide a working **Node.js, TypeScript** application
  - Which uses the **Azure SDK for JavaScript**
  - Azure SDK invoked by the **azu-js** NPM library for ease of use 

---

## Screen Shots


---

## Provisioning and Deployment

### Provisioning Azure PaaS Services

This GitHub project intentionally **does not** provision any Azure PaaS services
for you; the intent is for you to use **YOUR** Azure PaaS services with this application.

You configure this application to use your Azure PaaS services with the
**environment variables** listed below.

### Environment Variables

This application uses the following **specific environment variable names**.
You must set these up on your local Developer workstation.

See your PaaS serices in **Azure Portal** to obtain the values of most of 
these environment variables.

Note that these environment variables are used in all modes of deployment described below -
code, Docker Compose, or Azure Container Instance.

```
Name:                                 Sample Value:
------------------------------------  -----------------------------------------------
AZURE_COSMOSDB_NOSQL_RW_KEY1	        vxQ7...
AZURE_COSMOSDB_NOSQL_URI	            https://gbbcjcdbnosql.documents.azure.com:443/
AZURE_OPENAI_EMBEDDINGS_DEPLOYMENT	  embeddings
AZURE_OPENAI_KEY1	                    b910...
AZURE_OPENAI_URL	                    https://cjz5mxhd2ciwy-openai.openai.azure.com/
AZURE_SEARCH_ADMIN_KEY	              xWzu...
AZURE_SEARCH_NAME	                    ngMx...
AZURE_SEARCH_URL	                    https://gbbcjsearch.search.windows.net
AZURE_WEB_AUTH_USERS	                gues...
AZURE_WEB_COOKIE_AGE	 (optional)     259200000
AZURE_WEB_COOKIE_KEYS	 (optional)     irxG...
PORT                   (optional)     3000

AZURE_SUBSCRIPTION_ID  (optional)     <-- only used in the az CLI deployment scripts
```

For example, the Sample Values shown are for my deployment.
The **secret** values shown above are truncated with **...** characters for obvious reasons.

You'll need to configure a list of one or more authorized users with the **AZURE_WEB_AUTH_USERS**
variable, in the format shown below.  Note the use of a double-tilde to separate users, and single-tilde characters to delimit the id and password values for each user.  Tilde characters
may not be present in either the ID or Password values.

```
user1_id~user1_password~~user1_id~user1_password~~user1_id~user1_password
```

You can re-implement class **AuthRouter** to use an alternative authorization and authentication
method, such as Microsoft Entra (formerly Azure Active Directory).

The **HTTP PORT** defaults to 3000.

See the NPM **cookie-session** Express library regarding the values for the 
**AZURE_WEB_COOKIE_KEYS** and **AZURE_WEB_COOKIE_AGE** environment variables,
but the defaults should be adequate.


#### Cosmos DB NoSQL API Containers

However, it is recommended that you create the following two **Cosmos DB NoSQL API** containers:

- **airports**, partition key **/pk**, with minimum throughput
- **baseballplayers**, partition key **/playerID**, with minimum throughput

The application contains the following JSON data files that you can upload via the web UI.
These can be used to populate the above two containers, respectively.

- data/world-airports-50.json
- data/baseball-players.json

#### OpenAI



### Deployment - With Docker Compose on Developer Workstation


### Deployment - To an Azure Container Instance 

### Deployment - Using the GitHub repository source code


---

## Links

- https://devblogs.microsoft.com/ise/2023/04/13/deploy-production-ready-nodejs-application-in-azure/
- https://learn.microsoft.com/en-us/azure/active-directory/develop/tutorial-v2-nodejs-webapp-msal

## A Dataset Used : The Sean Lahman Baseball Database

The [Sean Lahman Baseball Database](http://seanlahman.com/download-baseball-database/)
is used by this repository, under the
[Creative Commons License](https://creativecommons.org/licenses/by-sa/3.0/).
See file **data/baseball-players.json**
