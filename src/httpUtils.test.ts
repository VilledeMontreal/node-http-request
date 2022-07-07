// Ok in test files :
// tslint:disable:no-string-literal
// tslint:disable: max-func-body-length

import { IOrderBy, OrderByDirection, utils } from '@villedemontreal/general-utils/dist/src';
import { assert } from 'chai';
import * as express from 'express';
import * as http from 'http';
import httpHeaderFieldsTyped from 'http-header-fields-typed';
import * as HttpStatusCodes from 'http-status-codes';
import * as _ from 'lodash';
import * as superagent from 'superagent';
import { configs } from './config/configs';
import { constants } from './config/constants';
import { httpUtils } from './httpUtils';
import { setTestingConfigurations } from './utils/testingConfigurations';
const superagentMocker = require('superagent-mocker');

// ==========================================
// Set Testing configurations
// ==========================================
setTestingConfigurations();

describe('httpUtils', () => {
  describe('urlJoin', () => {
    it('single param with slash', async () => {
      assert.equal(httpUtils.urlJoin('http://google.com/'), 'http://google.com');
    });

    it('single param no slash', async () => {
      assert.equal(httpUtils.urlJoin('http://google.com'), 'http://google.com');
    });

    it('with slashes', async () => {
      assert.equal(httpUtils.urlJoin('http://google.com/', 'foo/', '/bar/'), 'http://google.com/foo/bar');
    });

    it('without slashes', async () => {
      assert.equal(httpUtils.urlJoin('http://google.com', 'foo', 'bar'), 'http://google.com/foo/bar');
    });

    it('without double slashes', async () => {
      assert.equal(httpUtils.urlJoin('http://google.com/', '//foo/', '//bar/'), 'http://google.com/foo/bar');
    });

    it('with slashes without text', async () => {
      assert.equal(httpUtils.urlJoin('http://google.com/', '///', '//bar/'), 'http://google.com/bar');
    });

    it('with slashes and empty text', async () => {
      assert.equal(httpUtils.urlJoin('http://google.com/', '', '//bar/'), 'http://google.com/bar');
    });

    it('with slashes and null text', async () => {
      assert.equal(httpUtils.urlJoin('http://google.com/', null, '//bar/'), 'http://google.com/bar');
    });

    it('with slashes and undefined text', async () => {
      assert.equal(httpUtils.urlJoin('http://google.com/', undefined, '//bar/'), 'http://google.com/bar');
    });

    it('with http 2 slashes', async () => {
      assert.equal(httpUtils.urlJoin('http://', 'google.com', 'foo', 'bar'), 'http://google.com/foo/bar');
    });

    it('with http 1 slash', async () => {
      assert.equal(httpUtils.urlJoin('http:/', 'google.com', 'foo', 'bar'), 'http://google.com/foo/bar');
    });

    it('with http no slash', async () => {
      assert.equal(httpUtils.urlJoin('http:', 'google.com', 'foo', 'bar'), 'http://google.com/foo/bar');
    });

    it('another example', async () => {
      assert.equal(
        httpUtils.urlJoin('http://api.montreal.ca/accounts/', '/inum', '@5441521452', 'tickets'),
        'http://api.montreal.ca/accounts/inum/@5441521452/tickets'
      );
    });
  });

  describe('send', () => {
    describe('mocked', () => {
      let mock: any;
      before(async () => {
        mock = superagentMocker(superagent);

        mock.get('http://localhost/test', (req: any) => {
          return {
            body: {
              headers: req.headers
            }
          };
        });
      });

      after(async () => {
        mock.clearRoutes();
        mock.unmock(superagent);
      });

      it('URL must have a hostname', async () => {
        const request = superagent.get('/test');
        try {
          await httpUtils.send(request);
          assert.fail('expected send to throw an error');
        } catch (err) {
          assert.strictEqual(
            err.message,
            'The URL in your request MUST have a protocol and a hostname. Received: /test'
          );
        }
      });

      it('The Correlation Id is set automatically', async () => {
        const currentCid = configs.correlationId;

        const request = superagent.get('http://localhost/test').set('titi', '123');

        const response = await httpUtils.send(request);
        assert.isOk(response);
        assert.isOk(response.status);
        assert.strictEqual(response.status, 200);
        assert.isObject(response.body);
        assert.isObject(response.body.headers);

        const headers = response.body.headers;
        assert.strictEqual(headers.titi, '123');
        assert.strictEqual(headers[httpHeaderFieldsTyped.X_CORRELATION_ID.toLowerCase()], currentCid);
      });

      it('Regular response response', async () => {
        for (const status of [200, 201, 301, 400, 404, 500, 501]) {
          mock.get('http://localhost/test', (req: any) => {
            return {
              status,
              body: {
                msg: 'titi'
              }
            };
          });

          const request = superagent.get('http://localhost/test');
          const response = await httpUtils.send(request);

          assert.isOk(response);
          assert.isOk(response.status);
          assert.strictEqual(response.status, status);
          assert.isObject(response.body);
          assert.strictEqual(response.body.msg, 'titi');
        }
      });

      it('Timeouts are added, if not already set', async () => {
        const request = superagent.get('http://localhost/test').set('titi', '123');

        assert.isUndefined(request['_responseTimeout']);
        assert.isUndefined(request['_timeout']);

        const response = await httpUtils.send(request);
        assert.isOk(response);
        assert.strictEqual(request['_responseTimeout'], constants.request.timeoutsDefault.response);
        assert.strictEqual(request['_timeout'], constants.request.timeoutsDefault.deadline);
      });

      it('Response timeout already set', async () => {
        const request = superagent.get('http://localhost/test').set('titi', '123');

        request.timeout({
          response: 55555
        });

        assert.strictEqual(request['_responseTimeout'], 55555);
        assert.isUndefined(request['_timeout']);

        const response = await httpUtils.send(request);
        assert.isOk(response);
        assert.strictEqual(request['_responseTimeout'], 55555);
        assert.strictEqual(request['_timeout'], constants.request.timeoutsDefault.deadline);
      });

      it('Deadline timeout already set', async () => {
        const request = superagent.get('http://localhost/test').set('titi', '123');

        request.timeout({
          deadline: 55555
        });

        assert.isUndefined(request['_responseTimeout']);
        assert.strictEqual(request['_timeout'], 55555);

        const response = await httpUtils.send(request);
        assert.isOk(response);
        assert.strictEqual(request['_responseTimeout'], constants.request.timeoutsDefault.response);
        assert.strictEqual(request['_timeout'], 55555);
      });

      it('Both timeouts timeout already set', async () => {
        const request = superagent.get('http://localhost/test').set('titi', '123');

        request.timeout({
          deadline: 55555,
          response: 66666
        });

        assert.strictEqual(request['_responseTimeout'], 66666);
        assert.strictEqual(request['_timeout'], 55555);

        const response = await httpUtils.send(request);
        assert.isOk(response);
        assert.strictEqual(request['_responseTimeout'], 66666);
        assert.strictEqual(request['_timeout'], 55555);
      });
    });

    describe('Network/Server error', () => {
      it('Network/Server error', async () => {
        const mock: any = superagentMocker(superagent);

        mock.get('http://localhost/test', (req: any) => {
          throw new Error('Network error');
        });

        try {
          const request = superagent.get('http://localhost/test');
          const response = await httpUtils.send(request);
          assert.isNotOk(response);
          assert.fail();
        } catch (err) {
          /* ok */
        }
      });
    });
    describe('not mocked', () => {
      it('Errors are handled properly', async () => {
        try {
          const request = superagent.get('httttp://nope').timeout(100);
          const response = await httpUtils.send(request);
          assert.isNotOk(response);
          assert.fail();
        } catch (err) {
          assert.isObject(err);
          assert.isTrue('msg' in err);
          assert.isTrue('originalError' in err);
        }
      });
    });
  });

  describe(`Express request related tests`, () => {
    let app;
    let server: http.Server;
    let port: number;
    let expressRequest: express.Request;

    async function startServer(caseSensitive: boolean) {
      app = express();
      app.set('case sensitive routing', caseSensitive);
      app.get(
        '/',
        async (req: express.Request, res: express.Response, next: express.NextFunction): Promise<void> => {
          expressRequest = req;
          res.sendStatus(HttpStatusCodes.OK);
        }
      );
      port = await utils.findFreePort();
      server = await app.listen(port);
    }

    async function send(pathAndQueryString: string) {
      const superagentRequest = superagent.get(`http://localhost:${port}${pathAndQueryString}`);
      const response = await httpUtils.send(superagentRequest);
      assert.strictEqual(response.status, HttpStatusCodes.OK);
    }

    describe(`Query params functions - Case sensitive`, () => {
      before(async () => {
        // ==========================================
        // Set the configs for case sensitivity!
        // ==========================================
        setTestingConfigurations(true);
        await startServer(true);
      });

      after(() => {
        server.close();
      });

      it(`no query params`, async () => {
        await send(`/`);

        const values = httpUtils.getQueryParamAll(expressRequest, 'k');
        assert.deepEqual(values, []);

        let value: any = httpUtils.getQueryParamOne(expressRequest, 'k');
        assert.deepEqual(value, undefined);

        value = httpUtils.getQueryParamOneAsDate(expressRequest, 'k');
        assert.deepEqual(value, undefined);

        value = httpUtils.getQueryParamOneAsNumber(expressRequest, 'k');
        assert.deepEqual(value, undefined);

        value = httpUtils.getQueryParamOneAsBoolean(expressRequest, 'k');
        assert.deepEqual(value, undefined);
      });

      it(`one query params - simple string`, async () => {
        await send(`/?k=toto`);

        let values = httpUtils.getQueryParamAll(expressRequest, 'k');
        assert.deepEqual(values, ['toto']);

        values = httpUtils.getQueryParamAll(expressRequest, 'K'); // case sensitive
        assert.deepEqual(values, []);

        let value: any = httpUtils.getQueryParamOne(expressRequest, 'k');
        assert.deepEqual(value, 'toto');

        value = httpUtils.getQueryParamOne(expressRequest, 'K'); // case sensitive
        assert.deepEqual(value, undefined);

        let error;
        try {
          httpUtils.getQueryParamOneAsDate(expressRequest, 'k');
        } catch (err) {
          error = err;
        }
        if (!error) {
          assert.fail();
        }

        value = httpUtils.getQueryParamOneAsDate(expressRequest, 'k', (errMsg: string, val: string) => {
          assert.isOk(errMsg);
          assert.deepEqual(val, 'toto');
          return undefined;
        });
        assert.deepEqual(value, undefined);

        try {
          httpUtils.getQueryParamOneAsNumber(expressRequest, 'k');
        } catch (err) {
          error = err;
        }
        if (!error) {
          assert.fail();
        }

        value = httpUtils.getQueryParamOneAsNumber(expressRequest, 'k', (errMsg: string, val: string) => {
          assert.isOk(errMsg);
          assert.deepEqual(val, 'toto');
          return 123;
        });
        assert.deepEqual(value, 123);

        try {
          httpUtils.getQueryParamOneAsBoolean(expressRequest, 'k');
        } catch (err) {
          error = err;
        }
        if (!error) {
          assert.fail();
        }

        value = httpUtils.getQueryParamOneAsBoolean(expressRequest, 'k', (errMsg: string, val: string) => {
          assert.isOk(errMsg);
          assert.deepEqual(val, 'toto');
          return 123;
        });
        assert.deepEqual(value, 123);
      });

      it('one query params - date string', async () => {
        const dateStr = '2020-04-21T17:13:33.107Z';

        await send(`/?k=${encodeURIComponent(dateStr)}`);

        const values = httpUtils.getQueryParamAll(expressRequest, 'k');
        assert.deepEqual(values, [dateStr]);

        let value: any = httpUtils.getQueryParamOne(expressRequest, 'k');
        assert.deepEqual(value, dateStr);

        value = httpUtils.getQueryParamOneAsDate(expressRequest, 'k');
        assert.isTrue(_.isDate(value));
        assert.deepEqual(value, new Date(dateStr));

        value = httpUtils.getQueryParamOneAsDate(expressRequest, 'k', (_errMsg: string) => {
          assert.fail();
        });
        assert.deepEqual(value, new Date(dateStr));

        let error;
        try {
          httpUtils.getQueryParamOneAsNumber(expressRequest, 'k');
        } catch (err) {
          error = err;
        }
        if (!error) {
          assert.fail();
        }

        try {
          value = httpUtils.getQueryParamOneAsNumber(expressRequest, 'k', (_errMsg: string) => {
            throw new Error(`Custom Error`);
          });
        } catch (err) {
          error = err;
        }
        if (!error) {
          assert.fail();
        }
        assert.deepEqual(error.message, `Custom Error`);

        try {
          httpUtils.getQueryParamOneAsBoolean(expressRequest, 'k');
        } catch (err) {
          error = err;
        }
        if (!error) {
          assert.fail();
        }

        try {
          value = httpUtils.getQueryParamOneAsBoolean(expressRequest, 'k', (_errMsg: string) => {
            throw new Error(`Custom Error`);
          });
        } catch (err) {
          error = err;
        }
        if (!error) {
          assert.fail();
        }
        assert.deepEqual(error.message, `Custom Error`);
      });

      it('one query params - number string', async () => {
        const testNumber = 123;

        await send(`/?k=${testNumber}`);

        const values = httpUtils.getQueryParamAll(expressRequest, 'k');
        assert.deepEqual(values, [testNumber + '']);

        let value: any = httpUtils.getQueryParamOne(expressRequest, 'k');
        assert.deepEqual(value, testNumber + '');

        // ==========================================
        // Well, it seems '123' can actually be parsed
        // to a valid date. What can you do?
        // ==========================================
        value = httpUtils.getQueryParamOneAsDate(expressRequest, 'k');
        assert.deepEqual(value, new Date(testNumber + ''));

        value = httpUtils.getQueryParamOneAsNumber(expressRequest, 'k');
        assert.deepEqual(value, testNumber);

        value = httpUtils.getQueryParamOneAsNumber(expressRequest, 'k', (_errMsg: string) => {
          assert.fail();
        });
        assert.deepEqual(value, testNumber);

        let error;
        try {
          httpUtils.getQueryParamOneAsBoolean(expressRequest, 'k');
        } catch (err) {
          error = err;
        }
        if (!error) {
          assert.fail();
        }
      });

      it(`one query params - boolean`, async () => {
        await send(`/?k=true`);
        let value: any = httpUtils.getQueryParamOneAsBoolean(expressRequest, 'k');
        assert.deepEqual(value, true);

        await send(`/?k=TrUe`);
        value = httpUtils.getQueryParamOneAsBoolean(expressRequest, 'k');
        assert.deepEqual(value, true);

        await send(`/?k=false`);
        value = httpUtils.getQueryParamOneAsBoolean(expressRequest, 'k');
        assert.deepEqual(value, false);

        await send(`/?k=0`);
        let error;
        try {
          httpUtils.getQueryParamOneAsBoolean(expressRequest, 'k');
        } catch (err) {
          error = err;
        }
        if (!error) {
          assert.fail();
        }

        await send(`/?k=1`);
        try {
          httpUtils.getQueryParamOneAsBoolean(expressRequest, 'k');
        } catch (err) {
          error = err;
        }
        if (!error) {
          assert.fail();
        }
      });

      it('two different query params', async () => {
        await send(`/?k1=123&k2=titi`);

        let values = httpUtils.getQueryParamAll(expressRequest, 'k1');
        assert.deepEqual(values, ['123']);

        let value: any = httpUtils.getQueryParamOne(expressRequest, 'k1');
        assert.deepEqual(value, '123');

        values = httpUtils.getQueryParamAll(expressRequest, 'k2');
        assert.deepEqual(values, ['titi']);

        value = httpUtils.getQueryParamOne(expressRequest, 'k2');
        assert.deepEqual(value, 'titi');
      });

      it('two different query params, different only by casing!', async () => {
        await send(`/?k=123&K=titi`);

        let values = httpUtils.getQueryParamAll(expressRequest, 'k');
        assert.deepEqual(values, ['123']);

        let value: any = httpUtils.getQueryParamOne(expressRequest, 'k');
        assert.deepEqual(value, '123');

        values = httpUtils.getQueryParamAll(expressRequest, 'K');
        assert.deepEqual(values, ['titi']);

        value = httpUtils.getQueryParamOne(expressRequest, 'K');
        assert.deepEqual(value, 'titi');
      });

      it('One query param with multiple values - first value is a number, second value is a date', async () => {
        const dateStr = '2020-04-21T17:13:33.107Z';
        const testNumber = 123;

        await send(`/?k=${testNumber}&k=${encodeURIComponent(dateStr)}`);

        const values = httpUtils.getQueryParamAll(expressRequest, 'k');
        assert.deepEqual(values, [testNumber + '', dateStr]);

        let value: any = httpUtils.getQueryParamOne(expressRequest, 'k');
        assert.deepEqual(value, dateStr); // last value wins

        // last value wins and is parsable to a Date
        value = httpUtils.getQueryParamOneAsDate(expressRequest, 'k');
        assert.deepEqual(value, new Date(dateStr));

        // last value wins and can't be parsed to a number
        let error;
        try {
          httpUtils.getQueryParamOneAsNumber(expressRequest, 'k');
        } catch (err) {
          error = err;
        }
        if (!error) {
          assert.fail();
        }
      });

      it('One query param with multiple values - first value is a date, second value is a number', async () => {
        const dateStr = '2020-04-21T17:13:33.107Z';
        const testNumber = 123;

        await send(`/?k=${encodeURIComponent(dateStr)}&k=${testNumber}`);

        const values = httpUtils.getQueryParamAll(expressRequest, 'k');
        assert.deepEqual(values, [dateStr, testNumber + '']);

        let value: any = httpUtils.getQueryParamOne(expressRequest, 'k');
        assert.deepEqual(value, testNumber + ''); // last value wins

        // last value wins and CAN be parsed to a Date...
        // Yep, '123' can be parsed as date.
        value = httpUtils.getQueryParamOneAsDate(expressRequest, 'k');
        assert.deepEqual(value, new Date(testNumber + ''));

        // last value wins and can be parsed to a number
        value = httpUtils.getQueryParamOneAsNumber(expressRequest, 'k');
        assert.deepEqual(value, testNumber);
      });
    });

    describe('Query params functions - Case insensitive', () => {
      before(async () => {
        // ==========================================
        // Set the configs for case insensitivity!
        // ==========================================
        setTestingConfigurations(false);
        await startServer(false);
      });

      after(() => {
        server.close();
      });

      it('two different query params, different by casing!', async () => {
        await send(`/?k=123&K=titi`);

        let values = httpUtils.getQueryParamAll(expressRequest, 'k'); // lowercase
        assert.deepEqual(values, ['123', 'titi']);

        let value: any = httpUtils.getQueryParamOne(expressRequest, 'k'); // lowercase
        assert.deepEqual(value, 'titi'); // last value wins

        values = httpUtils.getQueryParamAll(expressRequest, 'K'); // uppercase
        assert.deepEqual(values, ['123', 'titi']);

        value = httpUtils.getQueryParamOne(expressRequest, 'K'); // uppercase
        assert.deepEqual(value, 'titi'); // last value wins
      });
    });

    describe('getOrderBys - Case insensitive', () => {
      before(async () => {
        setTestingConfigurations(false);
        await startServer(false);
      });

      after(() => {
        server.close();
      });

      it('Nil', async () => {
        await send(`/`);

        let orderBys: IOrderBy[] = httpUtils.getOrderBys(null);
        assert.deepEqual(orderBys, []);

        orderBys = httpUtils.getOrderBys(undefined);
        assert.deepEqual(orderBys, []);
      });

      it('No orderBys', async () => {
        await send(`/`);

        const orderBys: IOrderBy[] = httpUtils.getOrderBys(expressRequest);
        assert.deepEqual(orderBys, []);
      });

      it('one orderBy, default is asc', async () => {
        await send(`/?orderBy=name`);

        const orderBys: IOrderBy[] = httpUtils.getOrderBys(expressRequest);
        assert.deepEqual(orderBys, [
          {
            key: 'name',
            direction: OrderByDirection.ASC
          }
        ]);
      });

      it('one orderBy, explicit asc', async () => {
        await send(`/?orderBy=+name`);

        const orderBys: IOrderBy[] = httpUtils.getOrderBys(expressRequest);
        assert.deepEqual(orderBys, [
          {
            key: 'name',
            direction: OrderByDirection.ASC
          }
        ]);
      });

      it('one orderBy, desc', async () => {
        await send(`/?orderBy=-name`);

        const orderBys: IOrderBy[] = httpUtils.getOrderBys(expressRequest);
        assert.deepEqual(orderBys, [
          {
            key: 'name',
            direction: OrderByDirection.DESC
          }
        ]);
      });

      it('multiple orderBys', async () => {
        await send(`/?orderBy=-name,age,+nick,-color`);

        const orderBys: IOrderBy[] = httpUtils.getOrderBys(expressRequest);
        assert.deepEqual(orderBys, [
          {
            key: 'name',
            direction: OrderByDirection.DESC
          },
          {
            key: 'age',
            direction: OrderByDirection.ASC
          },
          {
            key: 'nick',
            direction: OrderByDirection.ASC
          },
          {
            key: 'color',
            direction: OrderByDirection.DESC
          }
        ]);
      });

      it('The case sensitivity of the "orderBy" key is not important', async () => {
        await send(`/?ORDERBY=-name`);

        const orderBys: IOrderBy[] = httpUtils.getOrderBys(expressRequest);
        assert.deepEqual(orderBys, [
          {
            key: 'name',
            direction: OrderByDirection.DESC
          }
        ]);
      });

      it('The case sensitivity of the orderBy *value* is kept', async () => {
        await send(`/?orderBy=-NAME`);

        const orderBys: IOrderBy[] = httpUtils.getOrderBys(expressRequest);
        assert.deepEqual(orderBys, [
          {
            key: 'NAME',
            direction: OrderByDirection.DESC
          }
        ]);
      });
    });

    describe('getOrderBys - Case sensitive', () => {
      before(async () => {
        setTestingConfigurations(true);
        await startServer(true);
      });

      after(() => {
        server.close();
      });

      it('The case sensitivity of the "orderBy" key is important', async () => {
        await send(`/?ORDERBY=-name`);

        const orderBys: IOrderBy[] = httpUtils.getOrderBys(expressRequest);
        assert.deepEqual(orderBys, []);
      });

      it('The case sensitivity of the orderBy *value* is kept', async () => {
        await send(`/?orderBy=-NAME`);

        const orderBys: IOrderBy[] = httpUtils.getOrderBys(expressRequest);
        assert.deepEqual(orderBys, [
          {
            key: 'NAME',
            direction: OrderByDirection.DESC
          }
        ]);
      });
    });
  });
});
