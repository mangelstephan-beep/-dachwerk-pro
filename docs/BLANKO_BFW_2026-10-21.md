# Modul 08 – Blankokalkulation 03/2025 und BFW-Übergabe

Stand: 21.10.2026. Zwei über Dropbox bereitgestellte Quelldateien:

- `/Bauleiter Zentrale/KALKULATIONHILFE/Blanko Kalkulation ab 03-25.xlsm` (Excel mit Makros, 19 Tabellenblätter)
- `/Bauleiter Zentrale/KALKULATIONHILFE/000 BFW Übergabedatei.xls` (älteres XLS, leere BFW-Übergabevorlage)

## Blankokalkulation – fachliches Mapping

Im Tabellenblatt **Kalkulation** befinden sich A–G für MLV, Position, Menge, Einheit, Kurz-/Langtext und Positionsart; H–AA enthalten vier Materialblöcke (Name, EK, Zuschnitt, Verschnitt, Minuten). AB–AD enthalten Befestiger, Müllentsorgung und Sonstiges; AE–AG enthalten Fremdarbeit, Art und Materialanteil; AI–AS bilden alternative Verkaufspreis-/Rohgewinnansichten ab. Im Blatt **Berechnung**, Zelle F3, werden die vier Materialien mit Preis × Zuschnitt (bei 0 => 1) × (1 + Verschnitt) kalkuliert. Minuten L/Q/V/AA fließen in den eigenen Lohnanteil (E3) ein.

Im DachWerkPro-LV kann `useDetailedMaterials` pro Position aktiviert werden. Die vier `materialName/Price/Cut/Waste/Minutes1..4`-Blöcke, `fasteners`, `disposal`, `miscellaneous`, `subcontractMaterialShare` und `otherMarkup` sind dann erfassbar. Verschnitt wird im DachWerkPro-Formular in **Prozent** eingegeben (z. B. 10 für 10 %). Der EK je Materialblock wird centgenau berechnet; Zu-/Verschnitt werden berücksichtigt; alle Minutenansätze und gegebenenfalls zusätzliche LV-Minuten werden addiert. Befestiger zählen zu Stoffkosten; Entsorgung und Sonstiges zu weiteren Kosten, die bei aktivierter Kostenartenkalkulation einen separaten Zuschlag haben. Der Fremdarbeits-Materialanteil wird als Nachweisinformation gespeichert, **nicht** stillschweigend von Fremdkosten abgezogen.

Vier Materialansätze dürfen nicht zugleich mit pauschalem `material` oder `materialId` verwendet werden; damit entfällt das Doppelzählungsrisiko. Ohne Aktivierung des neuen Modus ändert sich die bestehende Kalkulation nicht. Zielpreis und Positionsrabatt werden anschließend wie zuvor angewandt. Bestehende Angebotsfassungen bleiben eingefroren.

**Nicht übernommen:** VBA-Makros, vorhandene firmenbezogene Namen/Verrechnungssätze, Abhängigkeiten der Vorlagen zu Personal-, Bestell- und Ergebnis-Blättern oder ungeprüfte Kostenzuschläge. Amtliche EFB 221/222/223 sind nicht allein durch das Vorhandensein eines Vorlageblatts zertifiziert.

## BFW – Austauschformat

Die leere Datei enthält die Spalten **Pos, Menge, MEH, Kurztext, Langtext, EP, PA**. DachWerkPro stellt im EFB-Modul einen CSV-Export mit identischer Spaltenfolge, Semikolon und deutschen Dezimalzahlen bereit. Es ist **kein** binärer XLS-Export. Die bestehende XLS-Datei wird nicht überschrieben.

Die Bedeutung und erlaubten Codes für **PA** sind in der gelieferten Vorlage nicht dokumentiert. Deshalb exportiert DachWerkPro diesen Wert bewusst **leer**, bis das Zielsystem überprüft wurde. Grund-, Alternativ- und Bedarfspositionen müssen vor dem Einspielen gesondert geprüft werden; es erfolgt kein automatisches Angebot mit rechtsverbindlicher Positionsarten-Zuordnung.

## Prüfstatus

`test-blanko-bfw.cjs` deckt Vierfachmaterial, Zuschnitt, Verschnitt, Lohnminuten, Zuschläge, Zubehör, gemischte Alt-/Neupositionen und das BFW-Spaltenmapping ab. Es ist ein lokaler Entwicklungstest, **keine Live-/iPhone-Abnahme**. Modul 08 bleibt ROT bis fachlicher Prüfung und Geräteabnahme.
