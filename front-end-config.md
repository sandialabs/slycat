This is what we decided our new config.json for our react application
---
```json
{
	"models":
	[
		{
			"name" : "name",	
			"model_wizards":
			[
				{
					"action" : "create||delete||info||edit",
					"context": "project||model||global",
					"page":"path",
					"js": "path",
					"type": "name",
		                        "label": "friendly name"
				}
			],
			"page" : "/name/path",
			"js" : []
		}
	],
	"global_wizards" : 
	{
		"action" : "create||delete||info||edit",
		"context": "project||model||global",
		"page":"path",
		"js": "path",
		"type": "name",
		"label": "friendly name"
	},
	"server_url" : "full domain name",
	"server_friendly_name" : "friendly name like slycat"
}
```


File structure location
---

```pre
/model
   \	
   ---/ config.json
```
