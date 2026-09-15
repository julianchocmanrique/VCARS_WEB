import unittest
from nginx import add_route, INCLUDE

PREFIX = '''server {
  listen 443 ssl;
  server_name viralcoproducciones.com;
  return 301 https://www.viralcoproducciones.com$request_uri;
}
'''
SITE = '''server {
  server_name www.viralcoproducciones.com;
  location = / { try_files /index.html =404; }
  location ^~ /assets/ { try_files $uri =404; }
  location ^~ /kaptura/ { alias /var/www/html/kaptura/; }
  location / { try_files $uri $uri/ /index.html; }
  listen 443 ssl default_server;
}
'''
SUFFIX = '''server {
  listen 80;
  server_name viralcoproducciones.com www.viralcoproducciones.com;
  return 301 https://$host$request_uri;
}
'''


class RoutesTest(unittest.TestCase):
    def test_only_inserts_include_without_changing_existing_content(self):
        original = PREFIX + SITE + SUFFIX
        result = add_route(original)
        self.assertEqual(result.replace('  ' + INCLUDE + '\n', ''), original)
        self.assertTrue(result.startswith(PREFIX))
        self.assertTrue(result.endswith(SUFFIX))

    def test_repeated_deployments_do_not_duplicate_routes(self):
        once = add_route(PREFIX + SITE + SUFFIX)
        self.assertEqual(add_route(once), once)
        self.assertEqual(once.count(INCLUDE), 1)

    def test_refuses_wrong_domain_or_multiple_targets(self):
        for text in (PREFIX, SITE.replace('www.viralcoproducciones.com', 'other.example'), SITE + SITE):
            with self.assertRaises(ValueError):
                add_route(text)

    def test_does_not_replace_existing_vcars_route(self):
        with self.assertRaises(ValueError):
            add_route(SITE.replace('  location = / ', '  location = /vcars '))

    def test_braces_inside_comments_and_strings_are_ignored(self):
        text = SITE.replace('  location = /', '  # } not a closing brace\n  set $example "{text}";\n  location = /')
        self.assertEqual(add_route(text).replace('  ' + INCLUDE + '\n', ''), text)


if __name__ == '__main__':
    unittest.main()
