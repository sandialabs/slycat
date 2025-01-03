# Slycat Docker-compose 
This Docker system is primarily intended for Developer Use.  It can provide an example of a small, non-scalable, non-production Slycat instance that demonstrates how the Slycat service interacts with a web server and a CouchDB server.

## Requirements
  - Download `docker desktop for mac` see https://docs.docker.com/compose/install/
  - git
  - Currently only tested in a mac environment
## Docker service names

- haproxy
- slycat-web-server
- couchdb
- sshd
- slycat-client

### Starting slycat services

- Clone the repo `$ git clone --depth 1 -b master https://github.com/sandialabs/slycat.git`
- Navigate into the repo to `cd slycat/docker/compose/slycat-compose` in terminal the following commands control our services and use the docker-compose yaml found in the directory in the repo.
- Start the docker services `$ docker-compose up` this step should take some time on the first load to download the images.
- After the `slycat-client_1      | ℹ ｢wdm｣: Compiled successfully.` displays then everything has finished building and is running waiting for a connection.
- The client is served at https://localhost:9000, NOTE: the browser with show a security warning when navigating to localhost because Slycat generates a self signed certificate.
- admin::password is slycat::slycat
## List of helpful docker commands

#### Start the services

```bash
$ docker-compose up
```

#### Stopping slycat services
```bash
$ docker-compose down
```

#### Start and build the services

```bash
$ docker-compose up --build
```

#### Stopping and removing slycat services
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

### Building the images separate without using the cache
```bash
$ docker-compose build --no-cache
```

### Building the images and starting from cached images
```bash
$ docker-compose up --build
```
