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

  // Each grade/event stays in a small outer block. The section heading is kept
  // with the first event, while later events can move independently if the full
  // round-format section is taller than a page.
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

  // Keep the entire Programme of Events in one outer section block. The
  // document-wide keep-together pass below then moves this whole section to the
  // next page when it would otherwise cross a page boundary.
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

      items.forEach((item, index) => {
        appendPdfProgrammeItem_(cell, item);
        if (index < items.length - 1) {
          cell.appendParagraph('').setFontSize(2).setSpacingBefore(0).setSpacingAfter(0);
        }
      });
    });
  };

  // DocumentApp does not expose Google Docs' table-row preventOverflow flag.
  // Every logical PDF block is already wrapped by appendBlock_ in a top-level
  // one-row/one-cell table, so use the Docs REST API to apply preventOverflow
  // to all of those wrapper rows after the document has been saved.
  function applyPdfSectionKeepTogether_(docId) {
    try {
      const url = `https://docs.googleapis.com/v1/documents/${encodeURIComponent(docId)}`;
      const headers = {
        Authorization: `Bearer ${ScriptApp.getOAuthToken()}`
      };

      const readResponse = UrlFetchApp.fetch(url, {
        method: 'get',
        headers,
        muteHttpExceptions: true
      });

      if (readResponse.getResponseCode() < 200 || readResponse.getResponseCode() >= 300) {
        console.warn(`PDF keep-together read failed (${readResponse.getResponseCode()}): ${readResponse.getContentText()}`);
        return;
      }

      const document = JSON.parse(readResponse.getContentText());
      const content = document && document.body && Array.isArray(document.body.content)
        ? document.body.content
        : [];

      const requests = content
        .filter(element => {
          const table = element && element.table;
          const rows = table && Array.isArray(table.tableRows) ? table.tableRows : [];
          const cells = rows.length === 1 && Array.isArray(rows[0].tableCells) ? rows[0].tableCells : [];
          return element.startIndex != null && rows.length === 1 && cells.length === 1;
        })
        .map(element => ({
          updateTableRowStyle: {
            tableStartLocation: { index: element.startIndex },
            rowIndices: [0],
            tableRowStyle: { preventOverflow: true },
            fields: 'preventOverflow'
          }
        }));

      if (!requests.length) return;

      const updateResponse = UrlFetchApp.fetch(`${url}:batchUpdate`, {
        method: 'post',
        contentType: 'application/json',
        headers,
        payload: JSON.stringify({ requests }),
        muteHttpExceptions: true
      });

      if (updateResponse.getResponseCode() < 200 || updateResponse.getResponseCode() >= 300) {
        console.warn(`PDF keep-together update failed (${updateResponse.getResponseCode()}): ${updateResponse.getContentText()}`);
      }
    } catch (error) {
      // A layout-polish failure must never prevent the booking itself from being
      // received, saved and emailed.
      console.warn('PDF keep-together styling could not be applied:', error);
    }
  }

  // Preserve the existing booking-file behaviour, adding only the universal
  // section keep-together styling before the temporary Google Doc is exported.
  buildBookingFiles_ = function(pack) {
    const displayDate = formatFileDate_(pack.booking.competitionDate);
    const baseName = safeFileName_(pack.booking.competitionName || 'Speed Shear') + '_' + displayDate + '_Booking';
    const timingImport = buildTimingImport_(pack);
    const json = Utilities.newBlob(
      JSON.stringify(timingImport, null, 2),
      'application/json',
      baseName + '.json'
    );

    const doc = createBookingDocument_(pack);
    const docId = doc.getId();
    doc.saveAndClose();
    Utilities.sleep(500);

    applyPdfSectionKeepTogether_(docId);
    Utilities.sleep(300);

    const tempDocFile = DriveApp.getFileById(docId);
    const pdf = tempDocFile.getAs(MimeType.PDF).setName(baseName + '.pdf');
    tempDocFile.setTrashed(true);

    return { pdf, json };
  };
})();
