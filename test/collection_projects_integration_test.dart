import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/main.dart';

void main() {
  test('Vault exposes private projects without changing Wall state', () {
    final main = File('lib/main.dart').readAsStringSync();
    final vault = File('lib/main_vault.dart').readAsStringSync();

    expect(main, contains("models/vault/collection_project.dart"));
    expect(main, contains("screens/vault/collection_projects_screen.dart"));
    expect(vault, contains('CollectionProjectsScreen('));
    expect(vault, contains("tooltip: 'Collection Projects'"));
    expect(vault, contains('CollectionProjectSubjectType.set'));
    expect(vault, contains('CollectionProjectSubjectType.species'));
    expect(vault, contains('onOpenScanner: widget.onOpenScanner'));
    expect(vault, contains('onOpenVaultSpecies: widget.onOpenVaultSpecies'));
    expect(vault, isNot(contains("from('wall_sections')")));
    expect(vault, isNot(contains("from('wall_section_memberships')")));
  });

  test('Vault supplies shell actions to Collection Projects Dex entries', () {
    final shell = File('lib/main_shell.dart').readAsStringSync();
    final vault = File('lib/main_vault.dart').readAsStringSync();

    final vaultPageStart = shell.indexOf('return VaultPage(');
    final vaultPageEnd = shell.indexOf('\n        );', vaultPageStart);
    final vaultPage = shell.substring(vaultPageStart, vaultPageEnd);
    expect(vaultPage, contains('onOpenScanner: _startScanFlow'));
    expect(vaultPage, contains('onOpenVaultSpecies: _openVaultForSpecies'));

    final projectsStart = vault.indexOf('CollectionProjectsScreen(');
    final projectsEnd = vault.indexOf('\n        ),', projectsStart);
    final projects = vault.substring(projectsStart, projectsEnd);
    expect(projects, contains('GrookaiDexSpeciesScreen('));
    expect(projects, contains('onOpenScanner: widget.onOpenScanner'));
    expect(projects, contains('onOpenVaultSpecies: widget.onOpenVaultSpecies'));
  });

  test('Vault page retains supplied project Dex actions', () {
    Future<void> openScanner() async {}
    Future<void> openVaultSpecies({
      required String speciesSlug,
      required String displayName,
    }) async {}

    final vault = VaultPage(
      onOpenScanner: openScanner,
      onOpenVaultSpecies: openVaultSpecies,
    );

    expect(vault.onOpenScanner, same(openScanner));
    expect(vault.onOpenVaultSpecies, same(openVaultSpecies));
  });

  test('Dex species explicitly starts and stops a private project', () {
    final species = File(
      'lib/screens/dex/grookai_dex_species_screen.dart',
    ).readAsStringSync();

    expect(species, contains('CollectionProjectSubjectType.species'));
    expect(species, contains('_projectService.isTracking('));
    expect(species, contains('_projectService.startProject('));
    expect(species, contains('_projectService.stopProject('));
    expect(species, contains("'Track private project'"));
    expect(species, contains('Your Vault and Wall will not change.'));
    expect(species, isNot(contains("from('wall_sections')")));
    expect(species, isNot(contains("from('watches')")));
  });
}
