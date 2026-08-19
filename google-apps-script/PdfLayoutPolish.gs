(() => {
  function pdfEventTitle_(name, event) {
    const parts = [display_(name)];
    if (event && event.cleanShear) {
      parts.push(`Clean shear: Yes${event.cleanShearTimeLimit ? ` — ${event.cleanShearTimeLimit}` : ''}`);
    }
    parts.push(`Prize placings: ${display_(event && event.prizePlacings)}`);
    return parts.join('  •  ');
  }

  function appendPdfEventTable_(parent, name, event) {
    const rounds = event && Array.isArray(event.rounds) ? event.rounds : [];
    const table = parent.appendTable();
    table.setBorderWidth(1);

    const titleRow = table.appendTableRow();
    titleRow.appendTableCell(pdfEventTitle_(name, event));
    titleRow.appendTableCell('');
    titleRow.appendTableCell('');
    titleRow.getCell(2).merge();
    titleRow.getCell(1).merge();

    const titleCell = titleRow.getCell(0);
    titleCell.setBackgroundColor('#f2f2f2');
    titleCell.editAsText()
      .setBold(true)
      .setFontSize(11)
      .setForegroundColor('#111111');

    if (!rounds.length) {
      const emptyRow = table.appendTableRow();
      const emptyCell = emptyRow.appendTableCell('No rounds entered.');
      emptyCell.setBackgroundColor('#ffffff');
      emptyCell.editAsText().setBold(false).setForegroundColor('#111111');
      return;
    }

    const headerRow = table.appendTableRow();
    ['Round', 'Sheep per shearer', 'Qualifying to next round'].forEach(label => {
      const headerCell = headerRow.appendTableCell(label);
      headerCell.setBackgroundColor('#111111');
      headerCell.editAsText().setBold(true).setForegroundColor('#ffffff');
    });

    rounds.forEach(round => {
      const row = table.appendTableRow();
      const cells = [
        row.appendTableCell(display_(round && round.name)),
        row.appendTableCell(display_(round && round.sheepPerShearer)),
        row.appendTableCell(round && round.qualifiers != null ? String(round.qualifiers) : '—')
      ];
      cells.forEach(cell => {
        cell.setBackgroundColor('#ffffff');
        cell.editAsText().setBold(false).setForegroundColor('#111111');
      });
    });
  }

  function appendPdfProgrammeItem_(parent, item) {
    const grade = String(item && item.grade || '').trim();
    const round = String(item && item.round || '').trim();
    const table = parent.appendTable([[`${grade} ${round}`.trim()]]);
    table.setBorderWidth(1);
    const cell = table.getRow(0).getCell(0);
    cell.setBackgroundColor('#f2f2f2');
    cell.editAsText()
      .setBold(true)
      .setFontSize(11)
      .setForegroundColor('#111111');
  }

  // Keep each grade/event heading inside the table it describes. Each event is
  // also built as its own small outer block so a page break is less likely to
  // separate the title row from its round rows.
  appendRoundFormatSection_ = function(body, events) {
    const names = Object.keys(events || {});

    if (!names.length) {
      appendBlock_(body, cell => {
        sectionHeading_(cell, 'Grade / Event Round Format');
        cell.appendParagraph('No grades or events selected.').setSpacingAfter(4);
      });
      return;
    }

    names.forEach((name, index) => {
      appendBlock_(body, cell => {
        if (index === 0) sectionHeading_(cell, 'Grade / Event Round Format');
        appendPdfEventTable_(cell, name, events[name]);
      });
    });
  };

  // Build the Programme of Events as small keep-together blocks rather than
  // one large table row. The heading, confirmation note and first programme
  // item therefore move together when the remaining page space is too small.
  // Programme items are shown only as "Grade/Event Round" in the exact order
  // confirmed by the organiser; no order-number column or grouped round labels.
  appendConfirmedRunningOrder_ = function(body, program) {
    const items = normaliseProgramme_(program);

    appendBlock_(body, cell => {
      sectionHeading_(cell, 'Programme of Events');
      cell.appendParagraph('Confirmed by organiser. This is the running order supplied for timing-system setup.')
        .setBold(true)
        .setSpacingBefore(0)
        .setSpacingAfter(5);

      if (!items.length) {
        cell.appendParagraph('No programme entered.').setSpacingAfter(4);
        return;
      }

      appendPdfProgrammeItem_(cell, items[0]);
    });

    items.slice(1).forEach(item => {
      appendBlock_(body, cell => appendPdfProgrammeItem_(cell, item));
    });
  };
})();
