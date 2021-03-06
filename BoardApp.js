Ext.define('EstimationBoardApp', {
    extend: 'Rally.app.App',
    alias: 'widget.boardapp',

    requires: [
        'Rally.ui.cardboard.plugin.FixedHeader',
        'Rally.ui.gridboard.GridBoard',
        'Rally.ui.gridboard.plugin.GridBoardAddNew',
        'Rally.ui.gridboard.plugin.GridBoardCustomFilterControl',
        'Rally.ui.gridboard.plugin.GridBoardFieldPicker',
        'Rally.data.util.Sorter',
        'Settings',
        'Rally.clientmetrics.ClientMetricsRecordable'
    ],
    mixins: [
        'Rally.clientmetrics.ClientMetricsRecordable'
    ],

    cls: 'customboard',
    autoScroll: false,
    layout: 'fit',

    config: {
        defaultSettings: {
            types: [
                'HierarchicalRequirement',
                'Defect'
            ],
            showRows: false,
            sizes: '1,2,3,5,8'
        }
    },

    launch: function() {
        Rally.data.ModelFactory.getModels({
            types: this.getSetting('types'),
            context: this.getContext().getDataContext()
        }).then({
            success: function (models) {
                this.models = models;
                this.add(this._getGridBoardConfig());
            },
            scope: this
        });
    },

    _getGridBoardConfig: function() {
        var context = this.getContext(),
            modelNames = this.getSetting('types'),
            config = {
                xtype: 'rallygridboard',
                stateful: false,
                toggleState: 'board',
                cardBoardConfig: this._getBoardConfig(),
                plugins: [
                    {
                        ptype:'rallygridboardaddnew',
                        addNewControlConfig: {
                            stateful: true,
                            stateId: context.getScopedStateId('board-add-new')
                        }
                    },
                    {
                        ptype: 'rallygridboardcustomfiltercontrol',
                        filterChildren: false,
                        filterControlConfig: {
                            margin: '3 9 3 30',
                            modelNames: modelNames,
                            stateful: true,
                            stateId: context.getScopedStateId('board-custom-filter-button')
                        },
                        showOwnerFilter: true,
                        ownerFilterControlConfig: {
                            stateful: true,
                            stateId: context.getScopedStateId('board-owner-filter')
                        }
                    },
                    {
                        ptype: 'rallygridboardfieldpicker',
                        headerPosition: 'left',
                        boardFieldBlackList: ['Successors', 'Predecessors', 'DisplayColor'],
                        modelNames: modelNames,
                        boardFieldDefaults: ['PlanEstimate']
                    }
                ],
                context: context,
                modelNames: modelNames,
                storeConfig: {
                    filters: this._getFilters()
                },
                listeners: {
                    load: this._onLoad,
                    scope: this
                }
            };
        if(this.getEl()) {
            config.height = this.getHeight();
        }
        return config;
    },

    _onLoad: function() {
        this.recordComponentReady({
            miscData: {
                type: this.getSetting('type'),
                columns: this.getSetting('groupByField'),
                rows: (this.getSetting('showRows') && this.getSetting('rowsField')) || ''
            }
        });
    },

    _getBoardConfig: function() {
        var boardConfig = {
            margin: '10px 0 0 0',
            attribute: 'PlanEstimate',
            context: this.getContext(),
            cardConfig: {
                editable: true,
                showIconMenus: true
            },
            loadMask: true,
            plugins: [{ptype:'rallyfixedheadercardboard'}],
            storeConfig: {
                sorters: Rally.data.util.Sorter.sorters(this.getSetting('order'))
            },
            columnConfig: {
                columnHeaderConfig: {
                    headerTpl: '{size}'
                }
            },
            columns: _.map([null].concat(this.getSetting('sizes').split(',')), function(size) {
                return {
                    value: size && parseInt(size, 10),
                    columnHeaderConfig: {
                        headerData: {size: size || 'No Estimate'}
                    }
                };
            })
        };
        if (this.getSetting('showRows')) {
            Ext.merge(boardConfig, {
                rowConfig: {
                    field: this.getSetting('rowsField'),
                    sortDirection: 'ASC'
                }
            });
        }
        if (this._shouldDisableRanking()) {
            boardConfig.enableRanking = false;
            boardConfig.enableCrossColumnRanking = false;
            boardConfig.cardConfig.showRankMenuItems = false;
        }
        return boardConfig;
    },

    getSettingsFields: function() {
        return Settings.getFields(this.getContext());
    },

    _shouldDisableRanking: function() {
        return (!this.getSetting('showRows') || this.getSetting('showRows') &&
            this.getSetting('rowsField').toLowerCase() !== 'workproduct');
    },

    _addBoard: function() {
        var gridBoard = this.down('rallygridboard');
        if(gridBoard) {
            gridBoard.destroy();
        }
        this.add(this._getGridBoardConfig());
    },

    onTimeboxScopeChange: function(timeboxScope) {
        this.callParent(arguments);
        this._addBoard();
    },

    _getFilters: function() {
        var queries = [],
            timeboxScope = this.getContext().getTimeboxScope();
        if (this.getSetting('query')) {
            queries.push(Rally.data.QueryFilter.fromQueryString(this.getSetting('query')));
        }
        if (timeboxScope && _.all(this.models, function(model) {
                return model.hasField(Ext.String.capitalize(timeboxScope.getType()));
            })) {
            queries.push(timeboxScope.getQueryFilter());
        }

        return queries;
    }
});
