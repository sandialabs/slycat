# Slycat Docker-compose
## Requirements
  - download `docker` see https://docs.docker.com/compose/install/
## Docker service names

- haproxy
- slycat-web-server
- couchdb
- sshd
- slycat-client

### Starting slycat services

- From `~slycat/docker/compose/slycat-compose` in terminal the following commands control our services

#### Start the serivces

```bash
$ docker-compose up
```

#### Stoping slycat services
```bash
$ docker-compose down
```

#### Start and build the serivces

```bash
$ docker-compose up --build
```

#### Stoping and remooving slycat services
```bash
$ docker-compose down --remove-orphans 
```


### Starting slycat services in the background
```bash
$ docker-compose up -d
```


### Attaching to slycat services logs per service
```bash
$ docker-compose logs -f <name_of_service>
```

### Building the images seperate without using the cache
```bash
$ docker-compose build --no-cache
```

### Building the images and starting from cached images
```bash
$ docker-compose up --build
```
