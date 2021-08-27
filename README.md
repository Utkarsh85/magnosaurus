# magnosaurus

Simple mongodb orm that wraps mongodb native driver and provides model validations using ajv

### Installation
```javascript
npm i magnosaurus
```

### Test
```javascript
npm test
```

### Features

##### Api
- Find
```javascript
ModelName.find(<query>,<projection>).skip(<skip>).limit(<limit>).sort(<sort>).toArray()
```