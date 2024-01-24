# @villedemontreal/http-request

Utilitaires pour requêtes HTTP. Fourni principalement une fonction permettant de faire
des requêtes HTTP de manière à ce que les bons Correlation Ids soient envoyés.

## Configuration

Avant d'utiliser la fonction `httpUtils.send()`, il faut avoir correctement configuré la librairie.

La librarie a présentement besoin de deux configurations :

- Un "`Logger Creator`", qui est une fonction passée par le code appelant et servant à créer des Loggers
  configurés correctement.
- Un "`Correlation Id provider`". Ceci est requis car la librairie doit avoir accès
  aux bons Correlation Ids à ajouter aux requêtes effectuées.

Voici un exemple de code configurant la librairie, ici dans un projet démarré à l'aide du gabarit
[generator-mtl-node-api].

Dans le fichier "`src/init.ts`" du projet de l'API :

```typescript
import { init as initHttpUtils } from '@villedemontreal/http-request';
import { createLogger } from './utils/logger';
import { correlationIdService } from '@villedemontreal/correlation-id';
import { configs } from '../config/configs';

//...

export async function initComponents() {
  initHttpUtils(
    createLogger,
    () => {
      return correlationIdService.getId();
    },
    config.routing.caseSensitive, // required since 7.0.0
  );

  //...
}
```

Notez que si vous configurez la librairie depuis _une autre librairie_, vous aurez probablement à passer
le "`Logger Creator`", le "`Correlation Id provider`" et le "`caseSensitive`" que vous aurez _vous-même_ reçus
comme configurations! Le but étant que toutes les librairies utilisées dans un projet d'API, ainsi que leurs
propres librairies transitives, puissent logger de la même manière, aient accès aux bons Correlation Ids et
parsent les URLs de la même manière.

Finalement, notez qu'une fonction "`isInited()`" est exportée et permet au code appelant de valider que la librairie a été
configurée correctement.

## Utilisation

### Effectuer une requête HTTP

Il s'agit de créer un objet "SuperAgentRequest" en utilisant [SuperAgent](http://visionmedia.github.io/superagent/), et de passer
cet objet à la fonction "`send(...)`" fournie ici. Il ne faut _pas_ awaiter l'objet "SuperAgentRequest" lui-même, mais plutôt
l'appel à la fonction "`send(...)`"! Par exemple :

```typescript
import * as superagent from 'superagent';

//...

// Création de l'object requête
// (pas de "await" ici!)
let request = superagent
  .get('https://some.url')
  .set('someCustomHeader', '123')
  .accept('application/json');

// Utilisation de httpUtils pour lancer la requête.
// Le bon Correlation Id sera automatiquement ajouté.
// Ne pas oublier le "await"!
try {
  let response = await httpUtils.send(request);

  // Gestion des erreurs 4XX-5XX...
  if (!response.ok) {
    let status = response.status;
    //...
  }
  //...
} catch (err) {
  // Ici une erreur réseau s'est produite ou le serveur
  // demandé n'a pas été trouvé...
}
```

#### Gestion des erreurs

**Note importante** : la méthode `httpUtils.send(...)` gère les erreurs différement de la manière dont elles le sont
par défaut par SuperAgent! En effet, SuperAgent va _thrower_ une erreur lorsqu'une réponse avec status 4XX-5XX est retournée.
La méthode `httpUtils.send(...)`, au contraire, va _retourner ces réponses de manière régulière_ et c'est au code appelant
de valider le status HTTP (ou d'utiliser _`if (response.ok)`_). Le but est d'être en mesure de différencier entre une "erreur"
4XX-5XX et une _vraie_ erreur, par exemple lorsque la requête ne peut être effectuée car il y a un problème de réseau, ou lorsque
le host visé n'est pas trouvé.

Bref, il faut savoir qu'en utilisant `httpUtils.send(...)`, une erreur comme un "`Not Found`" (`404`) ne throwera **pas** d'erreur,
et c'est à vous à valider le status retourné...

### Autres utilitaires

#### getQueryParamAll

Retourne tous les paramètres de la _querystring_ d'un object `express.Request` spécifié.

Cette fonction tient compte de la configuration `urlCaseSensitive` ayant été utilisée lors
de l'initialisation de la librairie.

#### getQueryParamOne

Retourne un paramètre de la _querystring_ d'un object `express.Request` spécifié. Si
plusieures valeurs pour ce paramètre sont trouvées, la function retourne _la dernière trouvée_.

Cette fonction tient compte de la configuration `urlCaseSensitive` ayant été utilisée lors
de l'initialisation de la librairie.

#### getQueryParamOneAsDate

Retourne un paramètre de la _querystring_ d'un object `express.Request` spécifié, en tant
que `Date`. Si plusieures valeurs pour ce paramètre sont trouvées, la function retourne _la dernière trouvée_.

Si le paramètre est trouvé mais sa valeur ne peut être convertie en `Date` valide (en utilisant `new Date(xxx)`),
par défaut une `Error` est lancée. Mais si un `errorHandler` est passé en option, ce handler
sera appellé à la place. Dans une API basée sur `@villemontreal/generator-mtl-node-api`, ceci
vous permet de lancer une erreur custom, en utilisant par exemple `throw createInvalidParameterError(xxx)`.

Il est recommandé de toujours utiliser le format `ISO 8601` pour les dates.

Cette fonction tient compte de la configuration `urlCaseSensitive` ayant été utilisée lors
de l'initialisation de la librairie.

#### getQueryParamOneAsNumber

Retourne un paramètre de la _querystring_ d'un object `express.Request` spécifié, en tant
que `Number`. Si plusieures valeurs pour ce paramètre sont trouvées, la function retourne _la dernière trouvée_.

Si le paramètre est trouvé mais sa valeur ne peut être convertie en `Number` valide (en utilisant `Number(xxx)`),
par défaut une `Error` est lancée. Mais si un `errorHandler` est passé en option, ce handler
sera appellé à la place. Dans une API basée sur `@villemontreal/generator-mtl-node-api`, ceci
vous permet de lancer une erreur custom, en utilisant par exemple `throw createInvalidParameterError(xxx)`.

Cette fonction tient compte de la configuration `urlCaseSensitive` ayant été utilisée lors
de l'initialisation de la librairie.

#### getOrderBys

Retourne les `IOrderBy` spécifiés dans la querystring d'une requête de recherche.

#### urlJoin

Util to join part of url:

```typescript
import { httpUtils } from '@villedemontreal/http-request';

// To join multiple part of uri:
let url: string = httpUtils.urlJoin(
  'http://api.montreal.ca/accounts/',
  '/inum',
  '@5441521452',
  'tickets',
);
console.log(url); // http://api.montreal.ca/accounts/inum/@5441521452/tickets
```

#### buildUriObject

Util to parse an url and get the different parts:

```typescript
import { httpUtils } from '@villedemontreal/http-request';

let url: string = httpUtils.buildUriObject(
  'http://api.montreal.ca/accounts/inum/@5441521452/tickets',
);
console.log(url); // {"uri": "http://api.montreal.ca/accounts/inum/@5441521452/tickets", "baseUri":"http://api.montreal.ca", "path":"/accounts/inum/@5441521452/tickets"}
```

# Builder le projet

**Note**: Sur Linux/Mac assurz-vous que le fichier `run` est exécutable. Autrement, lancez `chmod +x ./run`.

Pour lancer le build :

- > `run compile` ou `./run compile` (sur Linux/Mac)

Pour lancer les tests :

- > `run test` ou `./run test` (sur Linux/Mac)

# Mode Watch

Lors du développement, il est possible de lancer `run watch` (ou `./run watch` sur Linux/mac) dans un terminal
externe pour démarrer la compilation incrémentale. Il est alors possible de lancer certaines _launch configuration_
comme `Debug current tests file - fast` dans VsCode et ainsi déboguer le fichier de tests présentement ouvert sans
avoir à (re)compiler au préalable (la compilation incrémentale s'en sera chargé).

Notez que, par défaut, des _notifications desktop_ sont activées pour indiquer visuellement si la compilation
incrémentale est un succès ou si une erreur a été trouvée. Vous pouvez désactiver ces notifications en utilisant
`run watch --dn` (`d`isable `n`otifications).

# Déboguer le projet

Trois "_launch configurations_" sont founies pour déboguer le projet dans VSCode :

- "`Debug all tests`", la launch configuration par défaut. Lance les tests en mode debug. Vous pouvez mettre
  des breakpoints et ils seront respectés.

- "`Debug a test file`". Lance _un_ fichier de tests en mode debug. Vous pouvez mettre
  des breakpoints et ils seront respectés. Pour changer le fichier de tests à être exécuté, vous devez modifier la ligne appropriée dans le fichier "`.vscode/launch.json`".

- "`Debug current tests file`". Lance le fichier de tests _présentement ouvert_ dans VSCode en mode debug. Effectue la compîlation au préalable.

- "`Debug current tests file - fast`". Lance le fichier de tests _présentement ouvert_ dans VSCode en mode debug. Aucune compilation
  n'est effectuée au préalable. Cette launch configuration doit être utilisée lorsque la compilation incrémentale roule (voir la section "`Mode Watch`" plus haut)

# Aide / Contributions

Notez que les contributions sous forme de pull requests sont bienvenues.
